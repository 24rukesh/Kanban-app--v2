# Codebase Concerns

**Analysis Date:** 2026-05-14

## Tech Debt

**Duplicated `slugify` function:**
- Issue: Identical `slugify` implementation exists in three separate files with no shared utility export.
- Files: `lib/db/queries.ts:58`, `lib/db/init.ts:63`, `scripts/seed.ts:88`
- Impact: Any fix or edge-case change must be applied to all three independently; they can silently diverge.
- Fix approach: Extract to `lib/kanban/utils.ts` or `lib/db/utils.ts` and import in all three locations.

**Dual migration systems without coordination:**
- Issue: The project has both a manual `drizzle/` SQL migration directory run via `scripts/migrate.ts` and an inline `ensureDatabaseReady()` in `lib/db/init.ts` that applies `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` statements at runtime. There is no migration-state tracking (no `drizzle_migrations` journal table for the manual path). The two systems can conflict or silently produce divergent schemas depending on which path is used.
- Files: `lib/db/init.ts`, `scripts/migrate.ts`, `drizzle/0000_initial.sql`, `drizzle/0001_agent_fields.sql`
- Impact: Production deployments via Docker rely on runtime auto-init; `db:migrate` script is the development path. The schemas must be kept in sync manually. An operator who runs both can hit duplicate-column errors (currently swallowed by `ignorable` catch logic in `scripts/migrate.ts:43`).
- Fix approach: Commit to one migration mechanism. Prefer the Drizzle-managed SQL files and remove the runtime inline DDL in `init.ts`, or adopt Drizzle's built-in migration runner (`drizzle-orm/migrator`).

**Board settings are immutable post-seed:**
- Issue: `boardSettings` has no PATCH endpoint. The title and description shown on the public board can only be changed by editing the database directly or re-seeding.
- Files: `lib/db/queries.ts`, `app/api/admin/` (no settings route exists)
- Impact: Board title/description are effectively hardcoded at seed time.
- Fix approach: Add `PATCH /api/admin/settings` with an `updateBoardSettings` query.

**`kanban-app.tsx` is a 1038-line monolithic component:**
- Issue: All admin CRUD logic, drag-and-drop handling, UI rendering, and API fetch calls live in one file with no decomposition into subcomponents or custom hooks.
- Files: `components/kanban/kanban-app.tsx`
- Impact: Hard to test, hard to extend, high merge conflict risk. Any new feature increases this file's complexity.
- Fix approach: Extract API calls to `lib/api/` hooks (e.g., `useColumnMutations`, `useTaskMutations`), and split `SortableColumn`, `SortableTaskCard`, `TaskCard` into their own files under `components/kanban/`.

## Known Bugs

**Progress input fires an API call on every `onChange` keystroke with no debounce:**
- Symptoms: Typing "75" into the progress number input triggers two PATCH requests — one for "7" and one for "75". Under normal use this causes optimistic state flicker and redundant DB writes; under fast typing it produces race conditions where the last response may not be the last request.
- Files: `components/kanban/kanban-app.tsx:1001-1005`
- Trigger: Change the progress number field in the admin task card.
- Workaround: None currently. The final value usually wins due to sequential processing, but is not guaranteed.

**Reorder operations are not wrapped in a database transaction:**
- Symptoms: If the process crashes mid-loop in `reorderColumns` or `reorderTasks`, the board is left in a partially-reordered state with inconsistent `position` values. This requires manual DB correction.
- Files: `lib/db/queries.ts:249-258` (`reorderColumns`), `lib/db/queries.ts:358-374` (`reorderTasks`)
- Trigger: Process kill or crash during a reorder of many items.
- Workaround: Re-drag items to correct order via UI.

## Security Considerations

**Rate limiting uses `x-forwarded-for` without proxy trust verification:**
- Risk: An attacker can send arbitrary `x-forwarded-for` headers to cycle through IPs and bypass the 8-attempt-per-10-minute login rate limit entirely.
- Files: `app/api/admin/login/route.ts:15-17`
- Current mitigation: Rate limiter applies per-request IP string; `user-agent` is included in the key which adds minimal friction.
- Recommendations: Use `request.ip` (Next.js trusted value) as the primary key, or configure a trusted proxy list. At minimum, only read `x-forwarded-for` when behind a known reverse proxy.

**In-memory rate limiter resets on process restart:**
- Risk: The rate-limit `buckets` Map lives in module scope in `lib/auth/rate-limit.ts`. Any Next.js server restart (crash, deploy, scale-out) resets all counters. On multi-instance deployments the limit is per-instance, not global.
- Files: `lib/auth/rate-limit.ts:6`
- Current mitigation: None. Single-instance Docker deployment reduces exposure.
- Recommendations: For multi-instance deployments, back the rate limiter with a persistent store (Redis, or a SQLite table with TTL logic).

**Column `color` field stored as free-text string with only a `max(20)` length check:**
- Risk: The color value is stored as-is and injected directly into `style={{ backgroundColor: column.color }}` in JSX. React's inline style handling prevents classic CSS injection escaping to the document stylesheet, but an attacker with admin access could store a value exploiting browser-specific `backgroundColor` parsing edge cases.
- Files: `lib/validation.ts:13`, `components/kanban/kanban-app.tsx:738,814`
- Current mitigation: Value is admin-only input (requires valid session). JSX inline style does not emit raw `<style>` blocks.
- Recommendations: Validate the color field against a stricter pattern (e.g., `z.string().regex(/^#[0-9a-fA-F]{3,8}$/).or(z.literal(""))`) to ensure only hex values are accepted.

**Admin login key submitted as plaintext over HTTP in local development:**
- Risk: The unlock form POSTs the admin key to `/api/admin/login` as a JSON body. In production (behind HTTPS) this is fine. In local development without TLS the key is transmitted in cleartext.
- Files: `components/kanban/kanban-app.tsx:142-151`, `app/api/admin/login/route.ts`
- Current mitigation: Cookie is `secure: true` in production. Development is local.
- Recommendations: Document that the application must never be exposed over plain HTTP in any shared network environment.

**No security headers on responses:**
- Risk: No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Strict-Transport-Security` headers are set. The admin form could be embedded in an iframe by a third-party page.
- Files: `next.config.ts` (no `headers()` config), no middleware file
- Current mitigation: None.
- Recommendations: Add a `headers()` function in `next.config.ts` to set standard security headers on all responses.

**No Next.js middleware protecting the `/admin` route:**
- Risk: The `/admin` page is publicly reachable. A non-authenticated visitor can access the admin unlock form. Auth enforcement is done at the component/data-fetch level, not at the routing layer.
- Files: No `middleware.ts` exists in the project root.
- Current mitigation: The admin page only shows the unlock form when `!isAdmin`; it renders public-only board data when unauthenticated. Admin mutations require a valid session cookie on the server.
- Recommendations: Add a `middleware.ts` that, for `/admin`, verifies the session cookie and redirects to `/` if invalid, reducing admin page exposure.

## Performance Bottlenecks

**Reorder writes N individual UPDATE statements sequentially:**
- Problem: `reorderColumns` and `reorderTasks` issue one `UPDATE` statement per item inside a `for` loop. A board with 50 tasks sends 50 sequential writes within a single request.
- Files: `lib/db/queries.ts:249-258`, `lib/db/queries.ts:358-374`
- Cause: No batch update or `CASE WHEN` bulk update is used. SQLite is fast, but async `await` inside the loop serializes every write.
- Improvement path: Wrap the loop in `sqlite.transaction(() => { ... })` (synchronous better-sqlite3 API) to execute all updates as a single atomic batch. This would also fix the atomicity concern noted above.

**`getBoardData` fetches all tasks then filters in application memory:**
- Problem: Task rows for the whole board are loaded in one query, then assembled into a `columnsById` Map in JavaScript. Sorting is also done in JavaScript after the fetch. For a board with hundreds of tasks this becomes a full table scan.
- Files: `lib/db/queries.ts:114-189`
- Cause: No per-column pagination or limit; tasks are always fetched in full.
- Improvement path: For the current scale (portfolio use), this is acceptable. If the board grows, add per-column task limits or a cursor-based approach.

## Fragile Areas

**`ensureDatabaseReady` global state is per-process:**
- Files: `lib/db/init.ts:60-61`
- Why fragile: `initialized` and `initializingPromise` are module-level variables. In Next.js development mode, hot-module replacement can reset module state without restarting the process, potentially triggering `applyInitialState` multiple times. In production (standalone), the module is loaded once per process lifecycle.
- Safe modification: Do not add logic to `applyInitialState` that must run exactly once without also adding an explicit idempotency guard (all DDL statements already use `IF NOT EXISTS`, so this is mostly covered).

**Column slug uniqueness relies on `Date.now()` suffix:**
- Files: `lib/db/queries.ts:199-200`, `lib/db/queries.ts:226`
- Why fragile: Slug is generated as `${baseSlug}-${Date.now()}`. Two simultaneous `createColumn` calls (e.g., via the agent API) within the same millisecond would produce the same slug and fail with a SQLite UNIQUE constraint error. The slug is also used as a stable agent lookup key (`getColumnBySlug`), so renaming a column changes its slug and silently breaks any agent workflows targeting that slug.
- Safe modification: Treat slugs as immutable after creation. Do not re-generate slug on rename (currently `updateColumn` does regenerate it on `lib/db/queries.ts:226`).

**`window.prompt` / `window.confirm` are the only admin input mechanisms:**
- Files: `components/kanban/kanban-app.tsx:168,172,191,235,255-268,319-326,355`
- Why fragile: Native browser dialogs are blocked by default in some iframe contexts, cannot be styled, do not support validation feedback, and are completely inaccessible (no keyboard-trap management, no ARIA). They are also synchronous blocking calls that freeze the tab.
- Safe modification: These are functional for the current single-user admin scenario. Any future embedding of the board (iframe, Electron shell) will break admin operations silently.

**`coverImage` is stored but never rendered in `TaskCard`:**
- Files: `lib/db/schema.ts:37`, `lib/kanban/types.ts:15`, `components/kanban/kanban-app.tsx` (no `<img>` for `coverImage`)
- Why fragile: The field is persisted, validated, and API-exposed but has no UI representation. Future implementation will need to add `next/image` domain allowlist in `next.config.ts` to avoid Content-Security-Policy violations when rendering external image URLs.

## Scaling Limits

**SQLite single-writer limitation:**
- Current capacity: Single-process Docker container with a volume-mounted SQLite file.
- Limit: SQLite allows only one writer at a time. WAL mode (`PRAGMA journal_mode = WAL`) allows concurrent reads. Any horizontal scaling to multiple Next.js instances sharing the same SQLite file is not supported and will cause write failures.
- Scaling path: Migrate to a client-server database (PostgreSQL via `drizzle-orm/postgres-js` or Turso for SQLite edge compatibility) if multi-instance deployment is needed.

## Dependencies at Risk

**`better-sqlite3` is a native addon:**
- Risk: Requires native compilation at build time. Any Node.js major version upgrade or change in the Alpine base image (`node:22-alpine` in Dockerfile) requires a rebuild. Pre-built binaries may not be available for all platforms.
- Impact: Docker image builds fail silently on platform mismatch (e.g., ARM vs x86).
- Migration plan: No change needed for the current deployment target. If platform flexibility is required, consider `@libsql/client` (pure JS, Turso-compatible) as a drop-in alternative.

**`lucide-react@^1.14.0` — major version:**
- Risk: `lucide-react` has historically introduced breaking icon name changes between major versions. `^1.14.0` allows any `1.x` upgrade which could rename icons in use.
- Impact: Build-time TypeScript errors if icon names are removed. Runtime missing icons if not caught.
- Migration plan: Pin to a specific minor version or audit icon API stability before upgrading.

## Missing Critical Features

**No error boundary or `error.tsx` page:**
- Problem: A crash in `getBoardData` or `ensureDatabaseReady` during SSR produces a raw Next.js 500 page. No custom error recovery UI exists.
- Blocks: Graceful degradation; user is shown a framework error page with potential stack traces.

**No `loading.tsx` or Suspense boundary for board data:**
- Problem: The board page uses `export const dynamic = "force-dynamic"` and fetches data synchronously in the Server Component. There is no streaming or loading state shown to the user during the initial fetch.
- Blocks: Perceived performance; the page is blank until all data resolves.

**No archive viewing or unarchive capability:**
- Problem: Tasks can be archived (soft-deleted) via the admin UI, but there is no UI or API endpoint to view archived tasks or restore them. The `archivedAt` field and `includeArchived` query option exist in the data layer but are never exposed.
- Blocks: Recovery of accidentally archived tasks without direct DB access.

## Test Coverage Gaps

**No tests for any API route handlers:**
- What's not tested: All 12 API routes — auth, column CRUD, task CRUD, reorder, agent upsert — have no integration or unit tests.
- Files: `app/api/admin/`, `app/api/agent/`, `app/api/board/`
- Risk: Auth bypass regressions, schema validation gaps, and DB error handling are entirely untested.
- Priority: High

**No tests for `lib/db/queries.ts`:**
- What's not tested: `createTask`, `updateTask`, `archiveTask`, `reorderTasks`, `reorderColumns`, `getBoardData`, `getColumnBySlug`, `getTaskByExternalRef` have no test coverage.
- Files: `lib/db/queries.ts`
- Risk: Silent regressions in data mapping, position calculation, or tag serialization.
- Priority: High

**No tests for `lib/db/init.ts` migration logic:**
- What's not tested: The backward-compat `ALTER TABLE` migration path and idempotency of `ensureDatabaseReady`.
- Files: `lib/db/init.ts`
- Risk: Schema migration failures on upgrade are only caught in production.
- Priority: Medium

**No tests for `KanbanApp` component:**
- What's not tested: Drag-and-drop event handling, optimistic update rollback, admin unlock flow, all `window.prompt` interactions.
- Files: `components/kanban/kanban-app.tsx`
- Risk: UI regressions in drag behavior or admin mutations are caught only manually.
- Priority: Medium

---

*Concerns audit: 2026-05-14*

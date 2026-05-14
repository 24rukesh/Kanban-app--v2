# Coding Conventions

**Analysis Date:** 2026-05-14

## Naming Patterns

**Files:**
- Route handlers: `route.ts` (Next.js App Router convention), co-located in `app/api/` subdirectories
- React components: `kebab-case.tsx` (e.g., `kanban-app.tsx`)
- Library modules: `kebab-case.ts` (e.g., `rate-limit.ts`, `ordering.ts`)
- Test files: `{module}.test.ts` co-located next to the module being tested (e.g., `ordering.test.ts`, `validation.test.ts`)

**Functions:**
- camelCase for all functions: `getBoardData`, `createTask`, `ensureAdminRequest`, `normalizeColumnPositions`
- Async functions named as verbs: `createAdminSessionToken`, `verifyAdminKey`, `checkRateLimit`
- Boolean-returning functions prefixed with `is`, `has`, or `ensure`: `isValidAdminSession`, `requestHasValidAgentKey`
- Guard functions that return a response-or-null use `ensure` prefix: `ensureAdminRequest`, `ensureAgentRequest`
- Private/internal helpers are unexported (no underscore prefix): `slugify`, `nowIso`, `parseTags`, `taskRowToTask`

**Variables:**
- camelCase throughout: `targetColumn`, `existingTask`, `columnRows`, `updatedAt`
- Descriptive names over abbreviations: `normalizedCandidate` not `nc`, `positionResult` not `res`
- Spread-and-override pattern uses `previous` for rollback snapshots: `const previous = columns;`

**Types:**
- PascalCase for exported types and interfaces: `KanbanTask`, `KanbanColumn`, `KanbanBoard`, `Priority`
- Inline `type` keyword over `interface` (all types use `type =`): `type CreateColumnInput = { ... }`
- Drizzle inferred types use the `$inferSelect` / `$inferInsert` pattern: `typeof tasks.$inferSelect`
- Props types named `{ComponentName}Props`: `KanbanAppProps`, `SortableColumnProps`, `TaskCardProps`
- Context params typed inline in route files: `type Context = { params: Promise<{ id: string }> }`

**Constants:**
- SCREAMING_SNAKE_CASE for module-level string constants: `ADMIN_COOKIE_NAME`, `COLUMN_PREFIX`, `TASK_PREFIX`
- Named numeric constants are camelCase: `SESSION_LIFETIME_SECONDS`, `defaultColumnSlug`

## Code Style

**Formatting:**
- No `.prettierrc` present; formatting enforced via ESLint (`eslint.config.mjs` using `eslint-config-next`)
- Trailing commas on multi-line objects and arrays (visible throughout codebase)
- Double quotes for string literals
- Semicolons present throughout

**Linting:**
- ESLint 9 flat config at `eslint.config.mjs`
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- No custom rules beyond the Next.js preset

**TypeScript:**
- Strict mode: no implicit `any`, strict null checks, etc.
- `import type` used for type-only imports: `import type { NextRequest } from "next/server"`
- Satisfies operator used for type-safe defaults: `input.priority ?? ("medium" satisfies Priority)`
- `void` used to explicitly discard floating promises: `void persistColumnOrder(next, previous)`

## Import Organization

**Order (3 groups separated by blank lines):**
1. Node built-ins with `node:` prefix (e.g., `import { randomUUID } from "node:crypto"`)
2. Third-party packages (e.g., `import { drizzle } from "drizzle-orm/better-sqlite3"`)
3. Internal aliases with `@/` prefix (e.g., `import { db } from "@/lib/db/client"`)
4. Relative imports last (e.g., `import { db } from "./client"`)

**Example (from `lib/db/queries.ts`):**
```typescript
import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull, max } from "drizzle-orm";

import type { KanbanBoard, KanbanColumn, KanbanTask, Priority } from "@/lib/kanban/types";

import { db } from "./client";
import { boardSettings, columns, tasks } from "./schema";
```

**Path Aliases:**
- `@/*` resolves to the repo root (configured in `tsconfig.json`)
- All cross-directory imports use `@/lib/...` not relative `../../`

## Error Handling

**API route pattern — guard-and-return:**
```typescript
// Check auth first, return early if unauthorized
const unauthorized = await ensureAdminRequest(request);
if (unauthorized) {
  return unauthorized;
}

// Parse and validate payload, return 400 on failure
const parsed = await parseJsonWithSchema(request, schema);
if (!parsed.success) {
  return jsonError("Descriptive message.", 400);
}

// Database operation, return 404 if entity not found
const result = await dbOperation(id, parsed.data);
if (!result) {
  return jsonError("Entity not found.", 404);
}
```

**`jsonError` helper** (`lib/http.ts`): `Response.json({ error: message }, { status })` — used for all non-2xx API responses.

**Client-side (React component):**
- Optimistic update with rollback: save `previous`, apply update, catch error and restore `previous`
- `error instanceof Error ? error.message : "Fallback message."` pattern used consistently
- `showError()` / `showStatus()` helper functions that clear the opposite message

**Server-side try/catch:**
- Used sparingly, only in login route where config errors throw: `try { ... } catch (error) { return jsonError(error instanceof Error ? error.message : "...", 500) }`
- DB functions return `null` for not-found rather than throwing

**Zod validation:**
- `schema.safeParse()` used (not `.parse()` which throws)
- Check `parsed.success` before accessing `parsed.data`
- `parseJsonWithSchema` in `lib/http.ts` wraps `request.json()` in a try/catch and passes `undefined` to safeParse on JSON parse failure

## Logging

**Framework:** None — no logging library present.

**Patterns:**
- No `console.log` / `console.error` calls in the codebase
- Errors surfaced to the client via JSON responses; no server-side logging

## Comments

**When to Comment:**
- Inline comments used only for non-obvious intent: `// Backward-compatible additive migrations for existing SQLite files.`
- No JSDoc on exported functions
- No decorative comment blocks

## Function Design

**Size:** Functions are kept small and focused; database query functions are the largest, each handling one entity operation.

**Parameters:** Options bags for optional parameters: `options?: { includeHidden?: boolean; includeArchived?: boolean }`. Input types defined as local `type` aliases: `type CreateColumnInput = { ... }`.

**Return Values:**
- DB query functions return the domain type or `null` (not throwing): `updateColumn` returns `KanbanColumn | null`
- Guard functions return `Response | null`: `ensureAdminRequest` returns unauthorized response or `null`
- Boolean helpers return `boolean` directly: `verifyAdminKey`, `requestHasValidAgentKey`

## Module Design

**Exports:**
- Named exports only — no default exports from library modules
- React components use named exports: `export function KanbanApp(...)`
- Next.js pages/layouts use default exports: `export default function Home()`
- Route handlers export named HTTP verb functions: `export async function POST(...)`, `export async function PATCH(...)`

**Barrel Files:** Not used. Each module is imported directly by path.

**`export const dynamic = "force-dynamic"`** is declared in every route file to opt out of static caching.

## React Component Patterns

**Component types:**
- Public-facing (server) components in `app/`: async functions, no `"use client"` directive
- Interactive components in `components/`: `"use client"` at top of file
- Sub-components in the same file as their parent (e.g., `SortableColumn`, `TaskCard` all in `kanban-app.tsx`)

**State management:**
- `useState` with functional updater `setColumns((prev) => ...)` for derived updates
- Optimistic UI: apply update immediately, revert on error using a saved `previous` snapshot
- `useMemo` for derived lists (e.g., `columnIds`)

**CSS:**
- Tailwind CSS v4 utility classes throughout
- CSS custom properties (`var(--kanban-bg)`, `var(--kanban-accent)`) for theming tokens
- `clsx` for conditional class merging: `clsx("base-class", condition && "conditional-class")`

---

*Convention analysis: 2026-05-14*

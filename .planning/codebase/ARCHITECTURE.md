<!-- refreshed: 2026-05-14 -->
# Architecture

**Analysis Date:** 2026-05-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                        │
├──────────────────────┬──────────────────────┬───────────────────────┤
│   Public Page        │   Admin Page         │   API Routes          │
│   `app/page.tsx`     │   `app/admin/        │   `app/api/`          │
│                      │    page.tsx`          │                       │
└──────────┬───────────┴──────────┬───────────┴──────────┬────────────┘
           │                      │                       │
           ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Library Layer                               │
│   Auth: `lib/auth/`   DB Queries: `lib/db/`   Logic: `lib/kanban/`  │
│   Validation: `lib/validation.ts`   HTTP: `lib/http.ts`             │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SQLite Database (Drizzle ORM)                    │
│   `data/kanban.sqlite`   Schema: `lib/db/schema.ts`                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Public Page | Server-renders board for anonymous visitors | `app/page.tsx` |
| Admin Page | Server-renders board with session-gated admin state | `app/admin/page.tsx` |
| KanbanApp | Client component — all UI state, drag-and-drop, API calls | `components/kanban/kanban-app.tsx` |
| API: Admin columns | CRUD + reorder for columns (cookie-auth guarded) | `app/api/admin/columns/` |
| API: Admin tasks | CRUD + reorder + archive for tasks (cookie-auth guarded) | `app/api/admin/tasks/` |
| API: Agent tasks | Upsert/patch/archive tasks via API key (machine-auth guarded) | `app/api/agent/tasks/` |
| API: Agent board | Full board read including hidden tasks (API key guarded) | `app/api/agent/board/route.ts` |
| API: Public board | Public board JSON (no auth) | `app/api/board/route.ts` |
| API: Auth | Login, logout, session check | `app/api/admin/login/`, `logout/`, `me/` |
| Auth: Session | JWT creation, verification, cookie management | `lib/auth/session.ts` |
| Auth: Guard | `ensureAdminRequest` helper used by all admin routes | `lib/auth/guard.ts` |
| Auth: Agent | API-key validation for agent routes | `lib/auth/agent.ts` |
| Auth: Rate limit | In-memory fixed-window counter for login endpoint | `lib/auth/rate-limit.ts` |
| DB: Client | SQLite connection via better-sqlite3 + Drizzle setup | `lib/db/client.ts` |
| DB: Init | Lazy idempotent schema bootstrap + additive migrations | `lib/db/init.ts` |
| DB: Schema | Drizzle table definitions: columns, tasks, board_settings | `lib/db/schema.ts` |
| DB: Queries | All typed query functions — no raw SQL outside of init | `lib/db/queries.ts` |
| Kanban Types | Shared TypeScript types: KanbanBoard, KanbanColumn, KanbanTask | `lib/kanban/types.ts` |
| Kanban Ordering | Position normalization and reorder payload builders | `lib/kanban/ordering.ts` |
| Validation | Zod schemas for every API endpoint input | `lib/validation.ts` |
| HTTP helpers | `jsonError()` and `parseJsonWithSchema()` utilities | `lib/http.ts` |

## Pattern Overview

**Overall:** Full-stack Next.js App Router with a single monolithic client component for all board UI

**Key Characteristics:**
- Server components fetch initial data and pass it as props to the client component
- The single `KanbanApp` client component owns all board state and makes all API calls
- API routes are purely thin handlers: auth check → parse/validate → call query → return JSON
- No middleware file — auth is enforced per-route by calling guard helpers
- Database bootstraps itself on first request via `ensureDatabaseReady()` — no separate migration step required in production

## Layers

**Presentation (Server Components):**
- Purpose: Fetch initial board data server-side, resolve session, render shell
- Location: `app/page.tsx`, `app/admin/page.tsx`
- Contains: Next.js page components (async RSC)
- Depends on: `lib/db/queries`, `lib/auth/session`, `lib/db/init`
- Used by: Next.js router

**UI (Client Component):**
- Purpose: All interactive board rendering, drag-and-drop, optimistic state
- Location: `components/kanban/kanban-app.tsx`
- Contains: `KanbanApp`, `SortableColumn`, `StaticColumn`, `SortableTaskCard`, `TaskCard`
- Depends on: `@dnd-kit/core`, `@dnd-kit/sortable`, `lib/kanban/ordering`, `lib/kanban/types`
- Used by: Both page server components via `<KanbanApp initialBoard={board} ... />`

**API Routes:**
- Purpose: REST endpoints consumed by the client component and external agents
- Location: `app/api/`
- Contains: Route handlers (`route.ts` files) only — no business logic
- Depends on: `lib/auth/guard`, `lib/auth/agent`, `lib/db/queries`, `lib/validation`, `lib/http`
- Used by: Browser client, external AI agents

**Library / Core:**
- Purpose: Shared logic — auth, database, types, validation, ordering
- Location: `lib/`
- Contains: All reusable server-side functions and TypeScript types
- Depends on: `drizzle-orm`, `jose`, `zod`, `better-sqlite3`
- Used by: Both API routes and server components

**Database:**
- Purpose: Persistent storage
- Location: `data/kanban.sqlite` (configurable via `DATABASE_URL` env var)
- Contains: Tables: `board_settings`, `columns`, `tasks`
- Accessed via: `lib/db/client.ts` (singleton Drizzle instance)

## Data Flow

### Public Board View (Read Path)

1. Browser requests `/` — Next.js routes to `app/page.tsx` (server component)
2. `ensureDatabaseReady()` bootstraps DB if first request (`lib/db/init.ts`)
3. `getBoardData({ includeHidden: false, includeArchived: false })` runs SQL (`lib/db/queries.ts`)
4. Board data passed as `initialBoard` prop to `<KanbanApp mode="public" />` (`components/kanban/kanban-app.tsx`)
5. React hydrates client component with server-rendered HTML

### Admin Login Flow

1. User visits `/admin` — rendered by `app/admin/page.tsx`
2. If no valid cookie, page renders `KanbanApp` with `initialAdmin={false}`
3. User submits admin key via the unlock form in `KanbanApp`
4. `POST /api/admin/login` — rate limit checked, key verified with timing-safe compare (`lib/auth/session.ts`), JWT created and set as HttpOnly cookie
5. `window.location.reload()` forces a server re-render with the new cookie
6. `/admin` page now reads valid cookie → `isAdmin=true` → board renders with edit controls

### Admin Write Operation (e.g. Create Task)

1. Admin clicks "+" in a column — `addTask()` function in `KanbanApp` opens browser prompts
2. `requestJson()` sends `POST /api/admin/tasks` with JSON payload
3. Route handler calls `ensureAdminRequest()` → verifies JWT cookie (`lib/auth/guard.ts`)
4. `parseJsonWithSchema(request, createTaskSchema)` validates input (`lib/validation.ts`)
5. `createTask(parsed.data)` inserts row, returns `KanbanTask` (`lib/db/queries.ts`)
6. Response updates `columns` state in `KanbanApp` via `setColumns()`

### Agent Upsert Flow

1. External agent sends `POST /api/agent/tasks/upsert` with `x-agent-api-key` header
2. `ensureAgentRequest()` validates key with timing-safe compare (`lib/auth/agent.ts`)
3. Schema validated via `agentTaskUpsertSchema` (`lib/validation.ts`)
4. `getTaskByExternalRef(externalRef)` checks for existing task — update or create (`lib/db/queries.ts`)
5. Returns `{ created: boolean, task: KanbanTask }`

### Drag-and-Drop Reorder

1. User drags column or task in `KanbanApp` — `handleDragOver` / `handleDragEnd` fire
2. Optimistic state update via `setColumns()` with normalized positions (`lib/kanban/ordering.ts`)
3. `persistColumnOrder()` or `persistTaskOrder()` sends `PATCH` to reorder endpoint
4. On error, `setColumns(previous)` reverts optimistic update

**State Management:**
- All board state lives in `useState` inside `KanbanApp` (`components/kanban/kanban-app.tsx`)
- No external state library — local React state only
- Optimistic updates with rollback on API error throughout all mutations

## Key Abstractions

**KanbanBoard / KanbanColumn / KanbanTask:**
- Purpose: Typed data shapes shared between server queries and client UI
- Location: `lib/kanban/types.ts`
- Pattern: Plain TypeScript types — no classes, no validation logic embedded

**getBoardData:**
- Purpose: Single function that assembles the full board from three tables
- Location: `lib/db/queries.ts` (`getBoardData`)
- Pattern: Accepts `{ includeHidden, includeArchived }` options to serve public, admin, and agent views from one function

**ensureDatabaseReady:**
- Purpose: Lazy database initializer — idempotent, promise-deduped
- Location: `lib/db/init.ts`
- Pattern: Module-level `initialized` boolean + `initializingPromise` — concurrent callers share the same initialization promise

**requestJson (client-side):**
- Purpose: Typed fetch wrapper used in `KanbanApp` for all API calls
- Location: `components/kanban/kanban-app.tsx` (local function, not exported)
- Pattern: Throws `Error` with server-provided message on non-ok status

**parseJsonWithSchema:**
- Purpose: Parse and validate request body against a Zod schema in one call
- Location: `lib/http.ts`
- Pattern: Returns Zod `SafeParseReturnType` — callers check `.success` before using `.data`

## Entry Points

**Public Board:**
- Location: `app/page.tsx`
- Triggers: `GET /`
- Responsibilities: DB init, fetch visible board data, render `KanbanApp` in read-only mode

**Admin Board:**
- Location: `app/admin/page.tsx`
- Triggers: `GET /admin`
- Responsibilities: DB init, resolve admin session from cookie, fetch full board data, render `KanbanApp` in admin mode

**API — Admin:**
- Location: `app/api/admin/`
- Triggers: HTTP requests from `KanbanApp` client component
- Endpoints: `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`, `POST /api/admin/columns`, `PATCH /api/admin/columns/[id]`, `DELETE /api/admin/columns/[id]`, `PATCH /api/admin/columns/reorder`, `POST /api/admin/tasks`, `PATCH /api/admin/tasks/[id]`, `DELETE /api/admin/tasks/[id]`, `PATCH /api/admin/tasks/reorder`

**API — Agent:**
- Location: `app/api/agent/`
- Triggers: External AI agents with `AGENT_API_KEY`
- Endpoints: `GET /api/agent/board`, `POST /api/agent/tasks/upsert`, `PATCH /api/agent/tasks/[id]`, `DELETE /api/agent/tasks/[id]`

**API — Public:**
- Location: `app/api/board/route.ts`
- Triggers: Any caller — no auth
- Endpoints: `GET /api/board`

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. SQLite access is synchronous via `better-sqlite3` but wrapped in `async` functions. The `initialized`/`initializingPromise` guard in `lib/db/init.ts` is not race-safe across multiple Node.js worker processes — use a single process or an external migration step in multi-instance deployments.
- **Global state:** `lib/db/client.ts` exports a module-level singleton `db` and `sqlite`. `lib/db/init.ts` holds module-level `initialized` boolean. `lib/auth/rate-limit.ts` holds a module-level `Map` — this state is lost on process restart and not shared across multiple instances.
- **Circular imports:** None detected.
- **No middleware:** Auth is enforced per-route — there is no `middleware.ts`. Adding a new admin route requires manually calling `ensureAdminRequest()`.
- **DB path:** Resolved from `DATABASE_URL` env var at module load time (`lib/db/client.ts`). Changing this at runtime is not supported.

## Anti-Patterns

### In-memory rate limit state

**What happens:** `lib/auth/rate-limit.ts` uses a module-level `Map<string, Bucket>` to track login attempts.
**Why it's wrong:** State is per-process and lost on restart. Multiple server instances do not share rate-limit counters, allowing distributed brute-force attacks.
**Do this instead:** Use a persistent store (Redis, SQLite table) for rate-limit buckets. A SQLite-backed counter would be consistent with the existing stack.

### All UI in one file

**What happens:** `components/kanban/kanban-app.tsx` is a 1039-line file containing `KanbanApp`, `SortableColumn`, `StaticColumn`, `SortableTaskCard`, and `TaskCard`.
**Why it's wrong:** High cognitive load, harder to test individual sub-components, merge conflicts more likely.
**Do this instead:** Extract each sub-component (`ColumnCard`, `TaskCard`, etc.) into separate files under `components/kanban/`.

### Slugify duplication

**What happens:** `slugify()` is defined identically in both `lib/db/queries.ts` and `lib/db/init.ts` and `scripts/seed.ts`.
**Why it's wrong:** Three copies means bug fixes must be applied in three places.
**Do this instead:** Extract `slugify` to `lib/kanban/utils.ts` and import from there.

## Error Handling

**Strategy:** Errors bubble up to API route handlers, which return structured JSON. Client-side errors are caught per-operation and shown in a status/error message bar.

**Patterns:**
- API routes return `{ error: string }` JSON with appropriate HTTP status via `jsonError()` in `lib/http.ts`
- Client component catches all `requestJson()` rejections and calls `showError(message)`, which sets `errorMessage` state rendered as a banner
- Optimistic updates store previous state and call `setColumns(previous)` in catch blocks to roll back on failure
- `ensureDatabaseReady()` throws on fatal DB failures — these are unhandled and will result in a 500 from Next.js

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` only — no structured logging framework.
**Validation:** Zod schemas in `lib/validation.ts` — applied at API boundary via `parseJsonWithSchema()` in `lib/http.ts`. No validation on the client side before sending.
**Authentication:** Two separate auth systems — admin uses JWT in HttpOnly cookie (`lib/auth/session.ts`); agents use static API key in `x-agent-api-key` header or `Authorization: Bearer` (`lib/auth/agent.ts`).

---

*Architecture analysis: 2026-05-14*

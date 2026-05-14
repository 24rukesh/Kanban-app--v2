# Codebase Structure

**Analysis Date:** 2026-05-14

## Directory Layout

```
kanban-app/
├── app/                    # Next.js App Router root
│   ├── admin/              # Admin board page (session-gated)
│   │   └── page.tsx        # Server component — admin entry point
│   ├── api/                # REST API routes
│   │   ├── admin/          # Admin-only endpoints (JWT cookie auth)
│   │   │   ├── columns/    # Column CRUD + reorder
│   │   │   │   ├── route.ts           # POST /api/admin/columns
│   │   │   │   ├── [id]/route.ts      # PATCH, DELETE /api/admin/columns/[id]
│   │   │   │   └── reorder/route.ts   # PATCH /api/admin/columns/reorder
│   │   │   ├── tasks/      # Task CRUD + reorder + archive
│   │   │   │   ├── route.ts           # POST /api/admin/tasks
│   │   │   │   ├── [id]/route.ts      # PATCH, DELETE /api/admin/tasks/[id]
│   │   │   │   └── reorder/route.ts   # PATCH /api/admin/tasks/reorder
│   │   │   ├── login/route.ts         # POST /api/admin/login
│   │   │   ├── logout/route.ts        # POST /api/admin/logout
│   │   │   └── me/route.ts            # GET /api/admin/me
│   │   ├── agent/          # Agent endpoints (API key auth)
│   │   │   ├── board/route.ts         # GET /api/agent/board
│   │   │   └── tasks/
│   │   │       ├── [id]/route.ts      # PATCH, DELETE /api/agent/tasks/[id]
│   │   │       └── upsert/route.ts    # POST /api/agent/tasks/upsert
│   │   └── board/
│   │       └── route.ts               # GET /api/board (public, no auth)
│   ├── favicon.ico
│   ├── globals.css         # Global CSS + Tailwind v4 import + CSS custom properties
│   ├── layout.tsx          # Root HTML shell with metadata
│   └── page.tsx            # Public board page (server component)
├── components/
│   └── kanban/
│       └── kanban-app.tsx  # Single client component for the entire board UI
├── data/
│   ├── kanban.sqlite       # SQLite database file (gitignored in production)
│   ├── kanban.sqlite-shm   # WAL shared memory file
│   └── kanban.sqlite-wal   # WAL log file
├── drizzle/                # Drizzle migration SQL files (for reference)
│   ├── 0000_initial.sql
│   └── 0001_agent_fields.sql
├── lib/
│   ├── auth/
│   │   ├── agent.ts        # Agent API key validation
│   │   ├── guard.ts        # ensureAdminRequest() helper
│   │   ├── rate-limit.ts   # In-memory fixed-window rate limiter
│   │   ├── rate-limit.test.ts
│   │   └── session.ts      # JWT creation/verification, cookie helpers
│   ├── db/
│   │   ├── client.ts       # SQLite + Drizzle client singleton
│   │   ├── init.ts         # Lazy schema bootstrap + seed
│   │   ├── queries.ts      # All typed database query functions
│   │   └── schema.ts       # Drizzle table + type definitions
│   ├── kanban/
│   │   ├── ordering.ts     # Position normalization + reorder payload builders
│   │   ├── ordering.test.ts
│   │   └── types.ts        # KanbanBoard, KanbanColumn, KanbanTask, Priority
│   ├── http.ts             # jsonError(), parseJsonWithSchema()
│   └── validation.ts       # All Zod schemas for API inputs
├── public/                 # Static assets served at /
├── scripts/
│   ├── migrate.ts          # Drizzle migration runner (npm run db:migrate)
│   └── seed.ts             # Database seeder with sample data (npm run db:seed)
├── .env.example            # Required env vars template
├── .env.coolify.example    # Coolify deployment env template
├── docker-compose.yml      # Docker Compose for local containerized dev
├── Dockerfile              # Production container (standalone Next.js output)
├── drizzle.config.ts       # Drizzle Kit config
├── eslint.config.mjs       # ESLint flat config
├── next.config.ts          # Next.js config (output: "standalone")
├── package.json
├── postcss.config.mjs      # PostCSS with Tailwind v4
└── tsconfig.json           # TypeScript config with @/* path alias
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router — pages and API routes
- Contains: Server components (pages), Route handlers (API)
- Key files: `app/page.tsx` (public board), `app/admin/page.tsx` (admin board), `app/layout.tsx` (root shell)

**`app/api/admin/`:**
- Purpose: All admin-only mutation endpoints
- Contains: Route handlers — auth guard → validate → query → respond
- Key pattern: Every handler calls `ensureAdminRequest()` first before any other work

**`app/api/agent/`:**
- Purpose: Machine-facing endpoints for external AI agents
- Contains: Route handlers — agent key guard → validate → query → respond
- Key pattern: Every handler calls `ensureAgentRequest()` first; tasks identified by `externalRef` not internal ID

**`components/kanban/`:**
- Purpose: All interactive Kanban UI
- Contains: One file — `kanban-app.tsx` with all sub-components co-located
- Key file: `components/kanban/kanban-app.tsx`

**`lib/auth/`:**
- Purpose: All authentication logic
- Contains: Session JWT management, admin guard, agent API key check, rate limiting
- Key files: `session.ts` (JWT), `guard.ts` (admin routes helper), `agent.ts` (agent routes helper)

**`lib/db/`:**
- Purpose: Database access layer
- Contains: Drizzle client singleton, schema, query functions, and lazy initializer
- Key files: `schema.ts` (source of truth for data shape), `queries.ts` (all reads/writes)

**`lib/kanban/`:**
- Purpose: Domain types and pure ordering logic shared between client and server
- Contains: TypeScript types and position-normalization utility functions
- Key files: `types.ts`, `ordering.ts`

**`data/`:**
- Purpose: SQLite database file storage
- Contains: `kanban.sqlite` and WAL files
- Generated: Yes (auto-created by `lib/db/client.ts` and `lib/db/init.ts`)
- Committed: No (should be in `.gitignore` for production; included in dev for convenience)

**`drizzle/`:**
- Purpose: SQL migration files generated by `drizzle-kit generate`
- Contains: Sequential migration SQL files
- Generated: Yes (by `npm run db:generate`)
- Committed: Yes (for reference and migration runner)

**`scripts/`:**
- Purpose: One-off CLI scripts for database management
- Contains: `migrate.ts` (applies Drizzle migrations), `seed.ts` (inserts sample data)

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Public board — server component, no auth
- `app/admin/page.tsx`: Admin board — server component, reads session cookie
- `app/layout.tsx`: Root HTML wrapper with metadata

**Configuration:**
- `next.config.ts`: Next.js config (`output: "standalone"`)
- `tsconfig.json`: TypeScript — `@/*` alias maps to repo root
- `drizzle.config.ts`: Drizzle Kit for migration generation
- `.env.example`: Required vars: `DATABASE_URL`, `ADMIN_ACCESS_KEY`, `SESSION_SECRET`, `AGENT_API_KEY`

**Core Logic:**
- `lib/db/schema.ts`: Database schema — source of truth for all data shapes
- `lib/db/queries.ts`: All database access — add new query functions here
- `lib/db/init.ts`: Bootstrap logic — auto-runs on first request
- `lib/kanban/types.ts`: Shared TypeScript types — edit when data model changes
- `lib/validation.ts`: All Zod schemas — one schema per API endpoint, add here when adding endpoints
- `lib/auth/session.ts`: JWT and cookie logic for admin auth
- `lib/auth/agent.ts`: API key validation for agent routes

**UI:**
- `components/kanban/kanban-app.tsx`: Entire board UI — `KanbanApp` root + all sub-components

**Testing:**
- `lib/auth/rate-limit.test.ts`: Unit tests for rate limiter
- `lib/kanban/ordering.test.ts`: Unit tests for ordering utilities
- `lib/validation.test.ts`: Unit tests for Zod schemas

## Naming Conventions

**Files:**
- Route handlers: always named `route.ts` (Next.js App Router convention)
- Page components: always named `page.tsx`
- Library files: kebab-case (e.g., `rate-limit.ts`, `kanban-app.tsx`)
- Test files: co-located with source, suffixed `.test.ts`

**Directories:**
- Feature groupings use kebab-case (e.g., `lib/auth/`, `lib/kanban/`, `components/kanban/`)
- API route directories mirror URL path segments (e.g., `app/api/admin/columns/[id]/`)

**Exports:**
- Named exports throughout — no default exports except Next.js page/layout components (which require default exports)
- Types use PascalCase: `KanbanBoard`, `KanbanColumn`, `KanbanTask`, `Priority`
- Functions use camelCase: `getBoardData`, `createColumn`, `ensureAdminRequest`

## Where to Add New Code

**New API endpoint (admin-only):**
1. Create directory under `app/api/admin/` matching the URL segment
2. Add `route.ts` with route handler
3. Call `ensureAdminRequest(request)` first in every handler
4. Add Zod schema to `lib/validation.ts`
5. Add query function to `lib/db/queries.ts`

**New API endpoint (agent-facing):**
1. Create directory under `app/api/agent/`
2. Add `route.ts` with route handler
3. Call `ensureAgentRequest(request)` first
4. Add schema to `lib/validation.ts`; add query to `lib/db/queries.ts`

**New UI component:**
- Current pattern: co-locate in `components/kanban/kanban-app.tsx`
- Preferred for new additions: create a separate file in `components/kanban/` (e.g., `components/kanban/task-card.tsx`) and import into `kanban-app.tsx`

**New database table:**
1. Add table definition to `lib/db/schema.ts`
2. Run `npm run db:generate` to create migration SQL
3. Add query functions to `lib/db/queries.ts`
4. Update `lib/db/init.ts` `tableSqlStatements` if auto-bootstrap is needed

**New shared type:**
- Add to `lib/kanban/types.ts` if it's a domain type (board-related)
- Add inline to the relevant `lib/` file if it's implementation-specific

**New utility/helper:**
- Auth-related: `lib/auth/`
- DB-related: `lib/db/queries.ts` or a new file in `lib/db/`
- Kanban domain logic: `lib/kanban/`
- HTTP response helpers: `lib/http.ts`

**Tests:**
- Co-locate `.test.ts` files next to the source file being tested (e.g., `lib/kanban/ordering.test.ts`)
- Run with `npm test` (vitest)

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and dev cache
- Generated: Yes
- Committed: No

**`data/`:**
- Purpose: SQLite database files
- Generated: Yes (on first request)
- Committed: No (for production — checked in for local dev convenience in this repo)

**`drizzle/`:**
- Purpose: SQL migration files
- Generated: Yes (via `drizzle-kit generate`)
- Committed: Yes

**`public/`:**
- Purpose: Static files served at root URL
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-05-14*

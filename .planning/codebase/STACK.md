# Technology Stack

**Analysis Date:** 2026-05-14

## Languages

**Primary:**
- TypeScript 5.x - All application code, config files, API routes, components, lib modules
- TSX - React component files in `app/` and `components/`

**Secondary:**
- SQL - Raw schema DDL in `drizzle/0000_initial.sql`, `drizzle/0001_agent_fields.sql`

## Runtime

**Environment:**
- Node.js 22 (Alpine) — pinned in `Dockerfile` as `node:22-alpine`; local machine runs v25.3.0

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.2.6 — App Router, React Server Components, API Routes (`app/api/`)
  - Config: `next.config.ts` — standalone output mode (`output: "standalone"`)
  - Build command: `next build --webpack` (Webpack bundler explicitly selected)

**UI:**
- React 19.2.4 — Client components and server components
- Tailwind CSS 4.x — Utility-first CSS; processed via `@tailwindcss/postcss` PostCSS plugin
  - PostCSS config: `postcss.config.mjs`

**Drag and Drop:**
- `@dnd-kit/core` ^6.3.1 — Drag-and-drop core primitives
- `@dnd-kit/sortable` ^10.0.0 — Sortable list extension
- `@dnd-kit/utilities` ^3.2.2 — CSS transform utilities; used in `components/kanban/kanban-app.tsx`

**Database ORM:**
- Drizzle ORM ^0.45.2 — Type-safe SQLite queries; schema at `lib/db/schema.ts`
- Drizzle Kit ^0.31.10 — Migration generation CLI; config at `drizzle.config.ts`

**Validation:**
- Zod ^4.4.3 — Runtime schema validation; all schemas in `lib/validation.ts`

**Authentication / JWT:**
- jose ^6.2.3 — JWT signing (`HS256`) and verification for admin sessions; used in `lib/auth/session.ts`

**Testing:**
- Vitest ^4.1.6 — Test runner (no separate config file; uses package.json scripts)

**Build/Dev:**
- tsx ^4.21.0 — TypeScript execution for scripts (`scripts/migrate.ts`, `scripts/seed.ts`)
- ESLint 9.x — Linting; config at `eslint.config.mjs` using `eslint-config-next` presets

## Key Dependencies

**Critical:**
- `better-sqlite3` ^12.10.0 — Synchronous SQLite driver; used by `lib/db/client.ts`
- `drizzle-orm` ^0.45.2 — ORM layer over SQLite; schema, queries, migrations
- `jose` ^6.2.3 — Stateless JWT session tokens for admin auth
- `zod` ^4.4.3 — All request body validation and schema enforcement

**Infrastructure:**
- `clsx` ^2.1.1 — Conditional class name utility for component styling
- `lucide-react` ^1.14.0 — Icon library used in UI components

**Types (dev):**
- `@types/better-sqlite3` ^7.6.13
- `@types/node` ^20
- `@types/react` ^19
- `@types/react-dom` ^19

## Configuration

**Environment:**
- `.env.example` documents required vars: `ADMIN_ACCESS_KEY`, `SESSION_SECRET`, `AGENT_API_KEY`, `DATABASE_URL`
- `.env.coolify.example` — Coolify PaaS deployment variant (no `DATABASE_URL`, uses container volume)
- `DATABASE_URL` defaults to `file:./data/kanban.sqlite` when not set

**Build:**
- `tsconfig.json` — `strict: true`, `moduleResolution: bundler`, path alias `@/*` maps to repo root
- `drizzle.config.ts` — SQLite dialect, schema at `lib/db/schema.ts`, migrations output to `drizzle/`
- `eslint.config.mjs` — Next.js Core Web Vitals + TypeScript rules

## Platform Requirements

**Development:**
- Node.js 22+ recommended (matches Docker image)
- npm (lockfile present)
- SQLite file auto-created at `data/kanban.sqlite` on first request

**Production:**
- Docker via `Dockerfile` (multi-stage: deps → builder → runner, Alpine Linux)
- SQLite persisted via Docker named volume `/data`
- Standalone Next.js output (`output: "standalone"`) — served via `node server.js`
- Port 3000 exposed; Coolify or Docker Compose for orchestration

---

*Stack analysis: 2026-05-14*

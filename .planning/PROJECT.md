# Kanban Board — Portfolio Edition

## What This Is

A public-facing Kanban board that doubles as a live portfolio project. Deployed at a separate subdomain
(e.g., `kanban.yourdomain.com`), it is always readable by anyone with no login required. The owner
accesses the admin panel via a password stored in an environment variable (`ADMIN_ACCESS_KEY`) to
manage columns, tasks, and board settings directly from the UI.

The current codebase is functionally complete but has accumulated tech debt, known bugs, and missing
hardening that are unacceptable for a public portfolio context. This project initiative is a full-pass
improvement: security hardening, bug fixes, UX polish, and two missing admin features (board settings
editor and archive management).

## Core Value

**A polished, secure, publicly visible Kanban board** — the kind of project that reflects well on the
owner's engineering quality when a potential employer or client looks at it.

## Context

- **Type:** Brownfield — codebase exists, GSD initialised post-build for structured improvement
- **Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, SQLite + Drizzle ORM,
  dnd-kit, jose JWT, Zod, Vitest
- **Deployment:** Docker (standalone output), Coolify or Docker Compose, SQLite on persistent volume
- **Access model:** Public read-only always; admin via `ADMIN_ACCESS_KEY` env var; agent API via
  `AGENT_API_KEY` env var
- **Portfolio integration:** Separate subdomain — portfolio site links out to this app

## Requirements

### Validated

(Existing capabilities — already working in the current codebase)

- ✓ Public board view (anyone can read columns and tasks, no auth) — existing
- ✓ Admin authentication via `ADMIN_ACCESS_KEY` env var (JWT cookie session) — existing
- ✓ Column CRUD with drag-and-drop reorder — existing
- ✓ Task CRUD with priorities, tags, progress, cover image field — existing
- ✓ Agent API (API key auth) for external AI agent reads and writes — existing
- ✓ Docker production deployment (standalone Next.js output) — existing
- ✓ Rate limiting on login endpoint — existing (in-memory, known limitations)
- ✓ Zod request validation on all API routes — existing
- ✓ Optimistic UI updates with rollback on error — existing

### Active

**Security**
- [ ] Security response headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
- [ ] Next.js middleware protecting `/admin` route (redirect unauthenticated to `/`)
- [ ] Rate limiter key uses trusted IP, not spoofable `x-forwarded-for`
- [ ] Column color field validated to hex pattern only (prevent CSS injection)

**Bug Fixes**
- [ ] Progress input debounced — no API call on every keystroke
- [ ] Reorder operations wrapped in SQLite transactions (atomicity + performance)

**Tech Debt**
- [ ] Duplicate `slugify` extracted to shared utility
- [ ] Migration system consolidated — one path (runtime DDL in `init.ts` removed, Drizzle SQL files are canonical)
- [ ] `kanban-app.tsx` decomposed — API calls extracted to hooks, sub-components into separate files

**Missing Admin Features**
- [ ] Board settings editor — edit board title and description from the admin UI
- [ ] Archive manager — view archived tasks and restore them from the admin panel

**UX & Reliability**
- [ ] `error.tsx` page — custom error boundary for SSR failures
- [ ] `loading.tsx` — loading state shown during initial board data fetch
- [ ] Cover image rendered in `TaskCard` UI (field exists in schema, never displayed)
- [ ] Replace `window.prompt` / `window.confirm` admin dialogs with proper modal UI

**Test Coverage**
- [ ] API route integration tests (auth, column CRUD, task CRUD, reorder, agent upsert)
- [ ] `lib/db/queries.ts` unit tests

### Out of Scope

- Multi-user collaboration or real-time sync — single-owner board; no WebSockets needed
- PostgreSQL migration — SQLite is sufficient for single-instance portfolio use
- OAuth / social login — env var password is the intended access model
- Pagination / infinite scroll — board scale is bounded by portfolio use
- Mobile-native app — web responsive is sufficient
- `loading.tsx` Suspense streaming — `force-dynamic` pattern is acceptable for now; `loading.tsx` with
  skeleton is the chosen approach instead

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep SQLite | Portfolio use, single instance — no multi-writer pressure | — Active |
| Keep `ADMIN_ACCESS_KEY` env var model | Simplest admin auth for solo owner; no user DB needed | — Active |
| Separate subdomain deployment | Portfolio links out rather than embedding; keeps apps independent | — Active |
| Decompose `kanban-app.tsx` | 1038 lines is unmaintainable; extract hooks + components | — Active |
| Consolidate to Drizzle SQL migrations | Runtime DDL creates dual-system confusion; SQL files are canonical | — Active |
| Modal UI over `window.prompt` | Iframes block native dialogs; portfolio may embed later | — Active |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after initialization*

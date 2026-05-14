@AGENTS.md

# Project: Kanban Board Portfolio Edition

## GSD Workflow

This project uses the GSD (Get Shit Done) workflow. Planning artifacts live in `.planning/`.

**Current milestone:** Improvement Pass v1
**Active phase:** Phase 1 — Security Hardening

### Phase execution order
1. `/gsd-discuss-phase 1` — Security Hardening (SEC-01..04)
2. `/gsd-discuss-phase 2` — Bug Fixes + DB Consolidation (BUG-01..02, DEBT-01..02)
3. `/gsd-discuss-phase 3` — Refactor + Admin Features (DEBT-03, UX-04, FEAT-01..02)
4. `/gsd-discuss-phase 4` — UX Polish + Test Coverage (UX-01..03, TEST-01..02)

### Key planning files
- `.planning/PROJECT.md` — project context and requirements
- `.planning/REQUIREMENTS.md` — all v1 requirements with REQ-IDs
- `.planning/ROADMAP.md` — phased roadmap with success criteria
- `.planning/STATE.md` — current execution state

## Codebase Context

- **Framework:** Next.js 16 App Router, React 19, TypeScript strict
- **Database:** SQLite via Drizzle ORM (`lib/db/`)
- **Auth:** JWT cookies for admin (`lib/auth/session.ts`), API key for agents (`lib/auth/agent.ts`)
- **UI:** Tailwind CSS v4, dnd-kit drag-and-drop, single `components/kanban/kanban-app.tsx` monolith (decomposition planned in Phase 3)
- **Tests:** Vitest — run with `npm test`
- **Dev server:** `npm run dev`

## Conventions

- All API routes call auth guard first (`ensureAdminRequest` / `ensureAgentRequest`)
- DB query functions return `null` for not-found, never throw
- Add Zod schemas to `lib/validation.ts` for new endpoints
- Use `@/*` path alias for cross-directory imports (not relative `../../`)
- Named exports everywhere except Next.js pages/layouts (which require default exports)
- No logging library — errors surfaced via JSON responses only

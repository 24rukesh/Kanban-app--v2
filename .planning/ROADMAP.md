# Roadmap: Kanban Board Portfolio Edition

## Overview

This roadmap drives a full-pass improvement of an existing, functionally complete Kanban board. The
codebase works — the goal is to harden it, clean it up, and ship the two missing admin features so
the app is portfolio-quality: secure, reliable, and visibly well-engineered.

Four phases execute sequentially. Each phase closes a clean gap: security holes first (blockers for
public exposure), then bugs and migration debt (correctness), then the admin feature surface and
component decomposition (capability + maintainability), then UX polish and test coverage (polish +
safety net).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Hardening** - Close all active security gaps before any public traffic
- [ ] **Phase 2: Bug Fixes + DB Consolidation** - Fix correctness bugs and unify the migration system
- [ ] **Phase 3: Refactor + Admin Features** - Decompose the monolith and deliver the two missing admin capabilities
- [ ] **Phase 4: UX Polish + Test Coverage** - Surface reliability improvements and build the test safety net

## Phase Details

### Phase 1: Security Hardening
**Goal**: The application is safe for public exposure — no missing headers, no route bypass, no spoofable rate-limit key, no free-text CSS injection vector
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. Every HTTP response from the app includes `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Strict-Transport-Security` headers — verifiable via browser DevTools or `curl -I`
  2. Visiting `/admin` without a valid session cookie redirects immediately to `/` — the unlock form is never served to an unauthenticated visitor
  3. The login rate limiter key is derived from `request.ip` (Next.js trusted value), not the `x-forwarded-for` header — a request with a spoofed `x-forwarded-for` value does not bypass the limit
  4. Submitting a column `color` value that is not a valid hex string (e.g., `red`, `javascript:alert(1)`) is rejected by the API with a 422 validation error
**Plans**: TBD

### Phase 2: Bug Fixes + DB Consolidation
**Goal**: Correctness issues are resolved and there is exactly one canonical migration path — no dual-system confusion in production or development
**Depends on**: Phase 1
**Requirements**: BUG-01, BUG-02, DEBT-01, DEBT-02
**Success Criteria** (what must be TRUE):
  1. Typing rapidly into the progress number field in the admin task card produces at most one PATCH request — fired 400ms after the user stops typing, not one per keystroke
  2. A simulated process kill during a column or task reorder leaves the database in the pre-reorder state — no partial position updates persist
  3. `slugify` has a single definition in `lib/kanban/utils.ts`; the three previous call sites import from that module — verified by grepping for duplicate function definitions
  4. The runtime inline DDL in `lib/db/init.ts` is removed; the app starts successfully using only Drizzle SQL migration files via `drizzle-orm/migrator`
**Plans**: TBD

### Phase 3: Refactor + Admin Features
**Goal**: The admin panel exposes board settings editing and archive management; the monolithic `kanban-app.tsx` is decomposed into maintainable units
**Depends on**: Phase 2
**Requirements**: DEBT-03, UX-04, FEAT-01, FEAT-02
**Success Criteria** (what must be TRUE):
  1. An admin can edit the board title and description from the admin UI and see the changes reflected immediately on the public board — no direct DB access required
  2. An admin can open an archive manager panel, see a list of archived tasks, and restore any task back to its original column — the restored task appears in the board immediately
  3. Admin create, rename, and delete actions use proper modal dialogs — no `window.prompt` or `window.confirm` calls remain anywhere in the codebase
  4. `kanban-app.tsx` no longer contains inline API mutation logic or sub-component definitions — mutations live in `lib/hooks/use-column-mutations.ts` and `lib/hooks/use-task-mutations.ts`; `SortableColumn`, `TaskCard`, and `SortableTaskCard` each have their own file under `components/kanban/`
**Plans**: TBD
**UI hint**: yes

### Phase 4: UX Polish + Test Coverage
**Goal**: The app handles failure gracefully and all critical server-side logic is covered by automated tests
**Depends on**: Phase 3
**Requirements**: UX-01, UX-02, UX-03, TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. An SSR failure (simulated by breaking `getBoardData`) renders the custom `app/error.tsx` page instead of the raw Next.js 500 — no stack trace is exposed to visitors
  2. The initial board load shows a skeleton layout while data fetches — the page is never blank during loading
  3. Task cards with a non-null `coverImage` URL render the image as a card header using `next/image` — visible in both the public board and admin view
  4. The Vitest suite includes integration tests covering all 12 API routes (auth, column CRUD, task CRUD, reorder, agent upsert) using an isolated SQLite database — all pass with `npm test`
  5. Unit tests for all `lib/db/queries.ts` functions (create, update, archive, reorder, read) pass with `npm test`
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 0/TBD | Not started | - |
| 2. Bug Fixes + DB Consolidation | 0/TBD | Not started | - |
| 3. Refactor + Admin Features | 0/TBD | Not started | - |
| 4. UX Polish + Test Coverage | 0/TBD | Not started | - |

# Requirements — Kanban Board Portfolio Edition

## v1 Requirements

### Security (SEC)

- [ ] **SEC-01**: Application sets security response headers on all routes — `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`
- [ ] **SEC-02**: Next.js middleware (`middleware.ts`) protects the `/admin` route — unauthenticated requests redirect to `/`
- [ ] **SEC-03**: Login rate limiter uses `request.ip` as the trusted IP key, not the spoofable `x-forwarded-for` header
- [ ] **SEC-04**: Column `color` field validated against a strict hex pattern (`/^#[0-9a-fA-F]{3,8}$/`) in `lib/validation.ts`

### Bug Fixes (BUG)

- [ ] **BUG-01**: Progress number input in the admin task card debounces API calls — no PATCH request fired until the user stops typing for at least 400ms
- [ ] **BUG-02**: `reorderColumns` and `reorderTasks` database operations are wrapped in SQLite transactions — partial reorders are impossible

### Tech Debt (DEBT)

- [ ] **DEBT-01**: `slugify` function extracted to a single shared utility (`lib/kanban/utils.ts`) and imported by `lib/db/queries.ts`, `lib/db/init.ts`, and `scripts/seed.ts`
- [ ] **DEBT-02**: Runtime inline DDL in `lib/db/init.ts` removed — Drizzle SQL migration files are the single canonical migration path; `drizzle-orm/migrator` runs at startup
- [ ] **DEBT-03**: `components/kanban/kanban-app.tsx` decomposed — API mutation calls extracted to custom hooks (`lib/hooks/use-column-mutations.ts`, `lib/hooks/use-task-mutations.ts`), and `SortableColumn`, `TaskCard`, `SortableTaskCard` split into separate files under `components/kanban/`

### Admin Features (FEAT)

- [ ] **FEAT-01**: Board settings editor in the admin panel — admin can edit board title and description; `PATCH /api/admin/settings` endpoint created; changes reflect immediately on the public board
- [ ] **FEAT-02**: Archive manager in the admin panel — admin can view a list of archived tasks and restore any of them; `GET /api/admin/tasks/archived` and `PATCH /api/admin/tasks/[id]/restore` endpoints created

### UX & Reliability (UX)

- [ ] **UX-01**: Custom `app/error.tsx` page — shown on SSR failures instead of the raw Next.js 500 page
- [ ] **UX-02**: `app/loading.tsx` skeleton — board skeleton shown during initial data load instead of a blank page
- [ ] **UX-03**: Cover image rendered in `TaskCard` when `coverImage` URL is non-null — displayed as a card header image using `next/image`
- [ ] **UX-04**: Admin create/rename/delete dialogs replaced with proper modal UI — `window.prompt` and `window.confirm` calls removed; modals support keyboard navigation and are iframe-safe

### Test Coverage (TEST)

- [ ] **TEST-01**: Integration tests for all 12 API routes — auth, column CRUD, task CRUD, reorder, and agent upsert — using Vitest and an in-memory or temp-file SQLite database
- [ ] **TEST-02**: Unit tests for all `lib/db/queries.ts` query functions — covering create, update, archive, reorder, and read operations

## v2 Requirements (Deferred)

- Board settings: custom CSS theme tokens from the admin panel (too open-ended for v1)
- Archive auto-purge after configurable TTL
- Task activity log / audit trail
- CSV export of board data
- Drag-and-drop within the archive manager

## Out of Scope

- Multi-user collaboration / WebSocket real-time sync — single-owner board; complexity not justified
- PostgreSQL migration — SQLite sufficient for single-instance portfolio use
- OAuth / social login — env var password is the intentional access model
- Mobile-native app — responsive web is the target
- Pagination / infinite scroll — portfolio-scale board is bounded
- `loading.tsx` Suspense streaming with RSC — skeleton approach chosen instead

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 — Security Hardening | Pending |
| SEC-02 | Phase 1 — Security Hardening | Pending |
| SEC-03 | Phase 1 — Security Hardening | Pending |
| SEC-04 | Phase 1 — Security Hardening | Pending |
| BUG-01 | Phase 2 — Bug Fixes + DB Consolidation | Pending |
| BUG-02 | Phase 2 — Bug Fixes + DB Consolidation | Pending |
| DEBT-01 | Phase 2 — Bug Fixes + DB Consolidation | Pending |
| DEBT-02 | Phase 2 — Bug Fixes + DB Consolidation | Pending |
| DEBT-03 | Phase 3 — Refactor + Admin Features | Pending |
| UX-04 | Phase 3 — Refactor + Admin Features | Pending |
| FEAT-01 | Phase 3 — Refactor + Admin Features | Pending |
| FEAT-02 | Phase 3 — Refactor + Admin Features | Pending |
| UX-01 | Phase 4 — UX Polish + Test Coverage | Pending |
| UX-02 | Phase 4 — UX Polish + Test Coverage | Pending |
| UX-03 | Phase 4 — UX Polish + Test Coverage | Pending |
| TEST-01 | Phase 4 — UX Polish + Test Coverage | Pending |
| TEST-02 | Phase 4 — UX Polish + Test Coverage | Pending |

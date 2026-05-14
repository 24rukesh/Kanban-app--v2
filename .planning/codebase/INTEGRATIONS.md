# External Integrations

**Analysis Date:** 2026-05-14

## APIs & External Services

**No third-party external APIs are used.** All integrations are self-contained within the application. There are no calls to Stripe, Twilio, SendGrid, AWS, Google, OpenAI, or any other hosted SaaS API.

**Agent API (internal):**
- Purpose: Allows external AI agents or automation scripts to read/write board tasks
- Authentication: API key via `x-agent-api-key` header or `Authorization: Bearer <key>` header
- Key validation: `lib/auth/agent.ts` — `requestHasValidAgentKey()`; timing-safe comparison
- Env var: `AGENT_API_KEY`
- Endpoints served:
  - `GET /api/agent/board` — full board read
  - `POST /api/agent/tasks/upsert` — create-or-update a task by `externalRef`
  - `PATCH /api/agent/tasks/[id]` — patch a task by internal ID
  - `GET /api/agent/tasks/[id]` — fetch a single task

## Data Storage

**Databases:**
- SQLite (via `better-sqlite3`)
  - File path: `data/kanban.sqlite` (default) or value of `DATABASE_URL` env var
  - In Docker: mounted at `/data/kanban.sqlite` via named volume `kanban_data`
  - Client: `lib/db/client.ts` — `drizzle-orm/better-sqlite3` adapter
  - WAL mode and foreign keys enabled at startup: `sqlite.pragma("journal_mode = WAL")` / `sqlite.pragma("foreign_keys = ON")`
  - Schema: `lib/db/schema.ts` — tables: `columns`, `tasks`, `board_settings`
  - Migrations: `drizzle/` directory (`0000_initial.sql`, `0001_agent_fields.sql`); applied via `scripts/migrate.ts`
  - Auto-init: `lib/db/init.ts` — `ensureDatabaseReady()` called on first API request; creates tables, applies backward-compatible column additions, seeds default columns if empty

**File Storage:**
- None — no file upload or object storage integration. The `coverImage` and `repoUrl` task fields store URLs (strings) only; image hosting is external and not managed by this application.

**Caching:**
- None — no Redis, Memcached, or in-memory HTTP cache. Rate limiting uses an in-process `Map` (module-level singleton in `lib/auth/rate-limit.ts`), which resets on process restart.

## Authentication & Identity

**Auth Provider:**
- Custom (no third-party identity provider — no Clerk, Auth0, Supabase Auth, etc.)

**Admin Session Auth:**
- Implementation: `lib/auth/session.ts`
- Flow: Admin submits `ADMIN_ACCESS_KEY` → verified with timing-safe comparison → JWT (`HS256`) minted via `jose` → stored in `HttpOnly` cookie `portfolio_kanban_admin`
- JWT signed with `SESSION_SECRET` env var; expires in 7 days
- Cookie: `HttpOnly`, `SameSite: lax`, `Secure` in production
- Validation on every admin API route: `requestIsAdmin(request)` checks cookie and verifies JWT

**Agent API Key Auth:**
- Implementation: `lib/auth/agent.ts`
- Flow: Request must carry `x-agent-api-key` header or `Authorization: Bearer <key>`; compared timing-safely against `AGENT_API_KEY` env var
- No sessions or tokens — stateless per-request key check

**Rate Limiting:**
- Implementation: `lib/auth/rate-limit.ts` — in-process sliding-window bucket
- Default: 8 requests per 10-minute window per key
- Applied to login endpoint to prevent brute-force on `ADMIN_ACCESS_KEY`

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar error reporting SDK.

**Logs:**
- Next.js default stdout logging only. No structured logging library (e.g., Winston, Pino) is configured.

## CI/CD & Deployment

**Hosting:**
- Docker container — `Dockerfile` produces a multi-stage Alpine image
- `docker-compose.yml` at repo root — single-service compose stack with named volume for SQLite persistence
- `.env.coolify.example` indicates Coolify PaaS is the intended production host (injects env vars via platform UI, no `DATABASE_URL` needed as volume path is hardcoded in Dockerfile)

**CI Pipeline:**
- None detected — no `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`, or similar CI config present.

## Environment Configuration

**Required env vars:**
- `ADMIN_ACCESS_KEY` — password for admin login; must be ≥12 characters
- `SESSION_SECRET` — HMAC signing key for admin JWTs; must be ≥16 characters
- `AGENT_API_KEY` — API key for agent/automation endpoints; must be ≥16 characters
- `DATABASE_URL` — SQLite file path (`file:./data/kanban.sqlite` default; Docker default `file:/data/kanban.sqlite`)

**Secrets location:**
- Runtime environment variables only (injected by Docker Compose or Coolify)
- `.env.example` and `.env.coolify.example` contain placeholder values for reference

## Webhooks & Callbacks

**Incoming:**
- None beyond the agent API endpoints listed above. No webhook receivers for GitHub, Stripe, etc.

**Outgoing:**
- None — the application makes no outbound HTTP calls to external services.

---

*Integration audit: 2026-05-14*

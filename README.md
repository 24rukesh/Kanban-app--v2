# Portfolio Kanban

Lightweight Next.js Kanban board for public portfolio visibility with a single admin editing mode.

## Stack

- Next.js App Router
- Drizzle ORM + SQLite (`better-sqlite3`)
- Zod validation
- `jose` session token cookie auth
- `@dnd-kit` drag and drop
- Docker (Coolify-friendly)

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
ADMIN_ACCESS_KEY=<very-long-secret>
SESSION_SECRET=<very-long-secret>
AGENT_API_KEY=<very-long-secret-for-ai-agents>
DATABASE_URL=file:./data/kanban.sqlite
```

Production example:

```bash
DATABASE_URL=file:/data/kanban.sqlite
```

## Local development

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Public board:

- `/`

Admin board:

- `/admin`

## API surface

Public:

- `GET /api/board`
- `GET /api/admin/me`

Admin session:

- `POST /api/admin/login`
- `POST /api/admin/logout`

Admin mutations:

- `POST /api/admin/columns`
- `PATCH /api/admin/columns/:id`
- `DELETE /api/admin/columns/:id`
- `PATCH /api/admin/columns/reorder`
- `POST /api/admin/tasks`
- `PATCH /api/admin/tasks/:id`
- `DELETE /api/admin/tasks/:id`
- `PATCH /api/admin/tasks/reorder`

Agent API (API-key protected):

- `GET /api/agent/board`
- `POST /api/agent/tasks/upsert`
- `PATCH /api/agent/tasks/:id`
- `DELETE /api/agent/tasks/:id`

## Docker / Coolify

Use `docker-compose.yml` for Coolify and local parity:

```bash
docker compose up -d --build
```

Coolify environment variables:

```bash
ADMIN_ACCESS_KEY=...
SESSION_SECRET=...
AGENT_API_KEY=...
```

Compose guarantees:

- Persistent SQLite storage on a named volume `kanban_data`.
- Health check on `GET /api/board`.
- Container auto-restart policy (`unless-stopped`).
- App listens on `0.0.0.0:3000` with production settings.

## Agent workflow

The agent endpoints are designed for idempotent task tracking.

1. Call `GET /api/agent/board` with `x-agent-api-key`.
2. Use `POST /api/agent/tasks/upsert` with a stable `externalRef` for each agent job.
3. Re-send the same `externalRef` to update progress, move columns (`columnSlug`), and rewrite metadata.
4. Archive when completed with `DELETE /api/agent/tasks/:id`.

Headers:

```bash
x-agent-api-key: <AGENT_API_KEY>
# or
Authorization: Bearer <AGENT_API_KEY>
```

Upsert example:

```json
{
  "externalRef": "agent-run-2026-05-13-001",
  "agentId": "seo-agent-1",
  "columnSlug": "building",
  "title": "Prepare SEO landing page cluster",
  "description": "Generate pages and interlinking draft",
  "priority": "high",
  "progress": 35,
  "tags": ["SEO", "Automation", "AI"],
  "projectUrl": "https://rukesh.in",
  "repoUrl": ""
}
```

## Notes

- Public access is read-only.
- All writes are admin-only and guarded server-side.
- Admin login uses env-key auth with secure HTTP-only cookie.
- Task deletion is archive behavior in v1.
- Agent writes are guarded by `AGENT_API_KEY` and do not require browser auth.

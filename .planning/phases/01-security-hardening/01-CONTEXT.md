# Phase 1: Security Hardening - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all active security gaps before any public traffic: set security response headers on every route, add Next.js middleware to route-guard `/admin`, fix the spoofable rate-limit IP key, and tighten column color validation to a strict hex pattern. No new features, no UI changes.

</domain>

<decisions>
## Implementation Decisions

### Security Headers (SEC-01)
- **D-01:** Add a `headers()` function to `next.config.ts` (the canonical place for Next.js response headers). Apply to all routes via a `"/(.*)"` pattern matcher.
- **D-02:** CSP value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`. The `unsafe-inline` allowance for scripts is required for Next.js 16 hydration inline scripts. `default-src 'self'` blocks everything else by default.
- **D-03:** HSTS is **production-only** — conditionally include `Strict-Transport-Security: max-age=31536000` only when `process.env.NODE_ENV !== 'development'`. Prevents poisoning the browser HSTS cache for localhost during `npm run dev`.
- **D-04:** Other required headers (always set): `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **D-05 (forward note):** Phase 4 (UX-03) adds `next/image` cover image rendering using external URLs. At that point the CSP `img-src` directive must be extended to `img-src 'self' https:`. The researcher and planner for Phase 4 should note this dependency.

### Admin Route Middleware (SEC-02)
- **D-06:** Create `middleware.ts` at the project root (Next.js convention).
- **D-07:** Verification depth: **full JWT verify** using `isValidAdminSession()` from `lib/auth/session.ts`. That function uses `jose` (`jwtVerify`) which is Edge Runtime compatible. Do not duplicate the verification logic — import from `lib/auth/session.ts` directly.
- **D-08:** Also import `ADMIN_COOKIE_NAME` from `lib/auth/session.ts` — read `request.cookies.get(ADMIN_COOKIE_NAME)?.value` and pass to `isValidAdminSession()`.
- **D-09:** Redirect unauthenticated requests to `/` (the public board). Use `NextResponse.redirect(new URL('/', request.url))`.
- **D-10:** Matcher config: scope to `/admin` **only** (not `/api/admin/*`). API routes already call `ensureAdminRequest()` per-route; double-guarding them adds overhead with no security benefit.

### Rate Limiter IP Key (SEC-03)
- **D-11:** Replace `x-forwarded-for` header parsing in `getClientKey()` (`app/api/admin/login/route.ts:14-18`) with `request.ip` as the primary key.
- **D-12:** Fallback when `request.ip` is `undefined` or `null`: use the string `"unknown"` — all unknown-IP clients share one bucket, which is the safe-fail direction.
- **D-13:** Keep the `user-agent` component of the key (it adds minimal friction). New key format: `` `${request.ip ?? "unknown"}:${userAgent}` ``

### Column Color Validation (SEC-04)
- **D-14:** New color regex: `/^#[0-9a-fA-F]{3,8}$/` — accepts 3-char shorthand (`#RGB`) through 8-char with alpha (`#RRGGBBAA`).
- **D-15:** Empty string is **allowed** to unset a column color. Schema: `z.string().regex(/^#[0-9a-fA-F]{3,8}$/).or(z.literal('')).optional()`.
- **D-16:** Apply to **both** `createColumnSchema` and `updateColumnSchema` in `lib/validation.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and Roadmap
- `.planning/REQUIREMENTS.md` — SEC-01, SEC-02, SEC-03, SEC-04 requirement definitions
- `.planning/ROADMAP.md` — Phase 1 success criteria (the four measurable outcomes)

### Security Context
- `.planning/codebase/CONCERNS.md` §Security Considerations — exact file/line references for each vulnerability being fixed

### Files Being Modified
- `next.config.ts` — Add `headers()` export; currently has only `output: "standalone"`
- `lib/validation.ts` — `createColumnSchema` (line 11) and `updateColumnSchema` (line 17) color fields need hex regex
- `app/api/admin/login/route.ts` — `getClientKey()` function (lines 14–18) uses `x-forwarded-for`; replace with `request.ip`
- `lib/auth/session.ts` — `isValidAdminSession()` and `ADMIN_COOKIE_NAME` are reused by the new middleware

### New File
- `middleware.ts` (project root) — Does not exist yet; must be created

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth/session.ts`: `isValidAdminSession(token)` — async, Edge Runtime compatible (uses `jose`/`jwtVerify`). Middleware imports this directly instead of duplicating JWT verify logic.
- `lib/auth/session.ts`: `ADMIN_COOKIE_NAME = "portfolio_kanban_admin"` — the canonical cookie name constant.
- `lib/auth/rate-limit.ts`: `checkRateLimit(key, options)` — the key derivation is the only change; the limiter itself is not being modified in this phase.

### Established Patterns
- `next.config.ts` uses TypeScript (`NextConfig` type from `"next"`); add `headers()` as a method on the config object following the same pattern.
- All auth-related logic lives under `lib/auth/` — middleware is the exception (must be project root per Next.js convention) but should import from `lib/auth/` rather than inline logic.
- `app/api/admin/login/route.ts` already imports `NextRequest` — `request.ip` is a property on `NextRequest`; no new import needed.

### Integration Points
- `middleware.ts` at project root — Next.js automatically picks this up; no registration needed.
- `next.config.ts` `headers()` function — applies to all routes including API routes, static assets, and pages; use `source: "/(.*)"` to catch everything.
- `lib/validation.ts` is the single validation source; no other files need changing for SEC-04.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the decisions above — open to standard implementation approaches for each requirement.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Security Hardening*
*Context gathered: 2026-05-14*

# Phase 1: Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 1-Security Hardening
**Areas discussed:** CSP script-src policy, HSTS environment scope, Middleware auth depth, Color field empty string

---

## CSP script-src policy

### Question 1: script-src value

| Option | Description | Selected |
|--------|-------------|----------|
| unsafe-inline + self | `script-src 'self' 'unsafe-inline'` — allows Next.js inline hydration scripts. Lower XSS protection, but the app has no user-generated markup. | ✓ |
| Nonce-based strict CSP | Generate per-request nonce, configure Next.js to inject it. Stronger, significantly more complex. | |
| Report-only first | Start with `Content-Security-Policy-Report-Only` before enforcing. Adds a step before real protection. | |

**User's choice:** unsafe-inline + self
**Notes:** App has no user-generated HTML rendered as markup, so the practical XSS risk from `unsafe-inline` is low. Nonce setup is deferred until there's a concrete need.

### Question 2: default-src fallback

| Option | Description | Selected |
|--------|-------------|----------|
| self only | `default-src 'self'` — all resources from same origin only | ✓ |
| self + data: URIs | Allows inline data: images in addition to same-origin | |
| self + https: for images | Allows any HTTPS image URL — useful once coverImage rendering is added | |

**User's choice:** self only
**Notes:** External image support (for coverImage) deferred to Phase 4 (UX-03). The CSP `img-src` directive will need `https:` added at that point.

---

## HSTS environment scope

### Question 1: Should HSTS be set in all environments?

| Option | Description | Selected |
|--------|-------------|----------|
| Production-only | Check `NODE_ENV !== 'development'`. Prevents browser HSTS cache poisoning for localhost. | ✓ |
| Always set it | Simpler config, but breaks `npm run dev` in the same browser profile after visiting prod. | |
| You decide | Claude picks the safer approach. | |

**User's choice:** Production-only
**Notes:** Gate with `process.env.NODE_ENV !== 'development'` in `next.config.ts` headers function.

### Question 2: max-age value

| Option | Description | Selected |
|--------|-------------|----------|
| 1 year / 31536000 | Standard recommendation. Good balance between protection and opt-out flexibility. | ✓ |
| 6 months / 15768000 | More conservative. Easier to walk back if needed. | |
| 2 years + includeSubDomains | Maximum protection, HSTS preload eligible, harder to reverse. | |

**User's choice:** 1 year / 31536000

---

## Middleware auth depth

### Question 1: JWT verify depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full JWT verify | Use `jose` (`jwtVerify`) in Edge Runtime via `isValidAdminSession()` from `lib/auth/session.ts`. Catches expired/forged tokens at the routing layer. | ✓ |
| Cookie presence check only | Just check that the cookie name exists. Forged/expired JWTs still pass. API route guards still catch them, but the admin HTML is served. | |
| You decide | Claude picks the most secure viable approach. | |

**User's choice:** Full JWT verify

### Question 2: Middleware scope

| Option | Description | Selected |
|--------|-------------|----------|
| /admin page only | Matcher: `['/admin']`. API routes already have `ensureAdminRequest()`. | ✓ |
| /admin page + /api/admin/* | Double-guards API routes. Adds Edge Runtime overhead on every admin API call. | |
| You decide | Claude picks based on defense-in-depth. | |

**User's choice:** /admin page only

---

## Color field empty string

### Question 1: Is "" a valid color value?

| Option | Description | Selected |
|--------|-------------|----------|
| Allow empty string to unset color | `z.string().regex(...).or(z.literal('')).optional()`. Empty string means "no color". | ✓ |
| Reject empty string — require hex or nothing | `z.string().regex(...).optional()`. Sending `""` returns 422. Slightly stricter. | |

**User's choice:** Allow empty string to unset color

---

## Claude's Discretion

None — all gray areas were resolved by user selection.

## Deferred Ideas

None — discussion stayed within phase scope.

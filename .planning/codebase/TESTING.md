# Testing Patterns

**Analysis Date:** 2026-05-14

## Test Framework

**Runner:**
- Vitest v4 (latest)
- No config file present — runs with default Vitest settings
- TypeScript support via project `tsconfig.json` (Vitest picks it up automatically)

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible API)

**Run Commands:**
```bash
npm test              # Run all tests once (vitest run)
npm run test:watch    # Interactive watch mode (vitest)
```

No coverage script is defined in `package.json`. Coverage is not currently measured.

## Test File Organization

**Location:**
- Co-located with the module under test — test files live in the same directory as the source file

**Naming:**
- `{module-name}.test.ts` pattern (no `.spec.` variant used)

**Existing test files:**
```
lib/
├── validation.test.ts          # Tests lib/validation.ts (Zod schemas)
├── auth/
│   └── rate-limit.test.ts      # Tests lib/auth/rate-limit.ts
└── kanban/
    └── ordering.test.ts        # Tests lib/kanban/ordering.ts
```

All three test files are pure TypeScript (`.test.ts`), not TSX — no React component tests exist.

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";

import { functionUnderTest } from "./module";

describe("subject noun", () => {
  it("verb phrase describing expected behaviour", () => {
    // arrange
    // act
    // assert
  });
});
```

- `describe` label uses a noun (e.g., `"task validation"`, `"rate limiter"`, `"kanban ordering"`)
- `it` label uses a present-tense verb phrase (e.g., `"rejects progress values above 100"`, `"blocks when limit is exceeded"`)
- No `beforeEach` / `afterEach` — setup is explicit per-test or per-suite
- No `test` alias — always use `it`

**Patterns:**
- Arrange-act-assert in linear order within each `it` block
- No nested `describe` blocks observed
- Stateful modules (e.g., rate limiter) expose a `resetRateLimitState()` function called at the start of the relevant test

## Mocking

**Framework:** None — no `vi.mock()`, `vi.fn()`, or `vi.spyOn()` calls exist in any test file.

**Strategy:** Tests exercise real implementations:
- `validation.test.ts` calls `schema.safeParse()` directly — no mocks needed
- `rate-limit.test.ts` calls the real in-memory bucket store, reset via `resetRateLimitState()`
- `ordering.test.ts` calls pure functions with hand-crafted fixture data

**What to Mock:**
- Currently nothing is mocked. For future database tests, mock `lib/db/client.ts` (`db` and `sqlite` exports).
- For future route handler tests, mock `lib/auth/guard.ts` and `lib/auth/agent.ts`.

**What NOT to Mock:**
- Pure utility functions in `lib/kanban/ordering.ts` — test them directly
- Zod schemas in `lib/validation.ts` — test them directly with `.safeParse()`

## Fixtures and Factories

**Test Data:**
- Inline fixture objects declared as `const` at module scope in the test file
- Full typed objects matching the domain `type` exactly (e.g., `KanbanColumn`, `KanbanTask`)

**Example (from `lib/kanban/ordering.test.ts`):**
```typescript
import type { KanbanColumn } from "./types";

const sampleColumns: KanbanColumn[] = [
  {
    id: "col-a",
    title: "Planning",
    slug: "planning",
    position: 0,
    color: "#000000",
    isVisible: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    tasks: [
      {
        id: "task-1",
        columnId: "col-a",
        title: "Task 1",
        // ... all required fields
      },
    ],
  },
];
```

**Location:** Fixtures are declared inline in the test file — no shared fixture directory or factory helpers exist.

## Coverage

**Requirements:** None enforced — no coverage thresholds or reporting configured.

**View Coverage:**
```bash
npx vitest run --coverage   # Requires @vitest/coverage-v8 or @vitest/coverage-istanbul (not installed)
```

Coverage packages are not installed. Adding coverage requires installing `@vitest/coverage-v8`.

## Test Types

**Unit Tests:**
- Only type present. Three files cover pure library logic: schema validation, rate limiting, and position ordering.
- Scope: single module, no I/O, no external dependencies.

**Integration Tests:**
- None. API route handlers (`app/api/**`) have no test coverage.

**E2E Tests:**
- Not used. No Playwright, Cypress, or similar tooling present.

**React Component Tests:**
- Not used. No `@testing-library/react` or `jsdom` environment configured. `KanbanApp` is untested.

## Common Patterns

**Schema validation testing (safeParse):**
```typescript
it("rejects progress values above 100", () => {
  const parsed = createTaskSchema.safeParse({
    columnId: "col-1",
    title: "Bad task",
    progress: 120,
  });

  expect(parsed.success).toBe(false);
});
```

**Stateful module reset pattern:**
```typescript
it("blocks when limit is exceeded", () => {
  resetRateLimitState();           // reset module-level state before test
  const key = "127.0.0.1:test";

  const first = checkRateLimit(key, { limit: 2, windowMs: 1_000 });
  const second = checkRateLimit(key, { limit: 2, windowMs: 1_000 });
  const third = checkRateLimit(key, { limit: 2, windowMs: 1_000 });

  expect(first.allowed).toBe(true);
  expect(second.allowed).toBe(true);
  expect(third.allowed).toBe(false);
  expect(third.retryAfterMs).toBeGreaterThan(0);
});
```

**Spread-and-override for test variations (from `ordering.test.ts`):**
```typescript
const next = normalizeColumnPositions([
  {
    ...sampleColumns[0],
    tasks: [sampleColumns[0].tasks[1]],  // override one field
  },
  {
    ...sampleColumns[1],
    tasks: [{ ...sampleColumns[0].tasks[0], columnId: "col-b" }],
  },
]);
```

**Deep equality assertion:**
```typescript
expect(payload.tasks).toEqual([
  { id: "task-2", columnId: "col-a", position: 0 },
  { id: "task-1", columnId: "col-b", position: 0 },
]);
```

---

*Testing analysis: 2026-05-14*

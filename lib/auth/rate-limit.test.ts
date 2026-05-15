import { describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimitState } from "./rate-limit";

describe("rate limiter", () => {
  it("blocks when limit is exceeded", () => {
    resetRateLimitState();
    const key = "127.0.0.1:test";

    const first = checkRateLimit(key, { limit: 2, windowMs: 1_000 });
    const second = checkRateLimit(key, { limit: 2, windowMs: 1_000 });
    const third = checkRateLimit(key, { limit: 2, windowMs: 1_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });
});


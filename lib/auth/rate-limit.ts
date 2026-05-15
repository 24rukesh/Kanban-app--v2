type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options?: { limit?: number; windowMs?: number },
) {
  const limit = options?.limit ?? 8;
  const windowMs = options?.windowMs ?? 10 * 60 * 1000;
  const now = Date.now();

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const nextBucket: Bucket = {
      count: 1,
      resetAt: now + windowMs,
    };
    buckets.set(key, nextBucket);
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterMs: windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}

export function resetRateLimitState() {
  buckets.clear();
}


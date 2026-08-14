export type TokenBucketConfig = {
  capacity: number;
  windowMs: number;
};

export type BucketState = {
  tokens: number;
  lastRefillMs: number;
};

/**
 * In-memory token bucket. One key (typically a client IP) shares a bucket.
 * Suitable as a lightweight per-instance limit (Vercel isolates memory
 * per lambda; still stops a single instance from burning the model key).
 */
export function takeToken(
  buckets: Map<string, BucketState>,
  key: string,
  nowMs: number,
  config: TokenBucketConfig,
): boolean {
  const refillPerMs = config.capacity / config.windowMs;
  let state = buckets.get(key);
  if (state === undefined) {
    state = { tokens: config.capacity, lastRefillMs: nowMs };
    buckets.set(key, state);
  } else {
    const elapsed = Math.max(0, nowMs - state.lastRefillMs);
    state.tokens = Math.min(
      config.capacity,
      state.tokens + elapsed * refillPerMs,
    );
    state.lastRefillMs = nowMs;
  }

  if (state.tokens < 1) {
    return false;
  }
  state.tokens -= 1;
  return true;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim();
    if (first !== undefined && first.length > 0) {
      return first;
    }
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp !== undefined && realIp.length > 0) {
    return realIp;
  }
  return "unknown";
}

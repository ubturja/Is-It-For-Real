import {
  clientIpFromHeaders,
  takeToken,
  type BucketState,
  type TokenBucketConfig,
} from "@/lib/api/ipTokenBucket";

/** Per-IP: 8/min — under Groq free-tier ~30 RPM for llama-3.3-70b-versatile. */
export const PERSONALIZE_RATE_CAPACITY = 8;
export const PERSONALIZE_RATE_WINDOW_MS = 60_000;

/**
 * Instance-wide rolling 24h budget for personalize. Must stay under Groq's
 * ~1,000 RPD so our limiter trips first; leaves headroom for reflection.
 */
export const PERSONALIZE_DAILY_CAPACITY = 400;
export const PERSONALIZE_DAILY_WINDOW_MS = 24 * 60 * 60 * 1_000;
export const PERSONALIZE_DAILY_BUCKET_KEY = "groq-personalize-rpd";

const PER_IP: TokenBucketConfig = {
  capacity: PERSONALIZE_RATE_CAPACITY,
  windowMs: PERSONALIZE_RATE_WINDOW_MS,
};

const DAILY: TokenBucketConfig = {
  capacity: PERSONALIZE_DAILY_CAPACITY,
  windowMs: PERSONALIZE_DAILY_WINDOW_MS,
};

const ipBuckets = new Map<string, BucketState>();
const dailyBuckets = new Map<string, BucketState>();

export function resetPersonalizeRateLimit(): void {
  ipBuckets.clear();
  dailyBuckets.clear();
}

export function allowPersonalizeRequest(
  request: Request,
  nowMs: number = Date.now(),
): boolean {
  const ip = clientIpFromHeaders(request.headers);
  if (!takeToken(ipBuckets, ip, nowMs, PER_IP)) {
    return false;
  }
  return takeToken(
    dailyBuckets,
    PERSONALIZE_DAILY_BUCKET_KEY,
    nowMs,
    DAILY,
  );
}

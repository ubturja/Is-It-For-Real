import {
  clientIpFromHeaders,
  takeToken,
  type BucketState,
  type TokenBucketConfig,
} from "@/lib/api/ipTokenBucket";

/** Enough for a few deliberate taps; far below a scrape/hammer. */
export const PERSONALIZE_RATE_CAPACITY = 8;
export const PERSONALIZE_RATE_WINDOW_MS = 60_000;

const CONFIG: TokenBucketConfig = {
  capacity: PERSONALIZE_RATE_CAPACITY,
  windowMs: PERSONALIZE_RATE_WINDOW_MS,
};

const buckets = new Map<string, BucketState>();

export function resetPersonalizeRateLimit(): void {
  buckets.clear();
}

export function allowPersonalizeRequest(
  request: Request,
  nowMs: number = Date.now(),
): boolean {
  const ip = clientIpFromHeaders(request.headers);
  return takeToken(buckets, ip, nowMs, CONFIG);
}

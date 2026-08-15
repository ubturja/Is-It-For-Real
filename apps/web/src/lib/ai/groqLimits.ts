/**
 * Groq free-tier published limits for llama-3.3-70b-versatile
 * (https://console.groq.com/docs/rate-limits): ~30 RPM, ~1,000 RPD.
 * App ceilings must stay below these so a demo hits our 429 first.
 */
export const GROQ_FREE_TIER_RPM = 30;
export const GROQ_FREE_TIER_RPD = 1_000;

/** SDK retries on 429 wait on Retry-After and look like a hang. Fail once. */
export const GROQ_GENERATE_MAX_RETRIES = 0;

function numericField(error: object, key: string): number | undefined {
  const value: unknown = (error as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export function isProviderRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if (numericField(error, "statusCode") === 429) {
    return true;
  }
  if (numericField(error, "status") === 429) {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return /\b429\b/.test(message) || /rate limit/i.test(message);
}

/** Minimum time between regenerate requests (from request start). */
export const REGENERATE_COOLDOWN_MS = 10_000;

export function canRegenerate(
  lastStartedAt: number | null,
  now: number,
): boolean {
  if (lastStartedAt === null) {
    return true;
  }
  return now - lastStartedAt >= REGENERATE_COOLDOWN_MS;
}

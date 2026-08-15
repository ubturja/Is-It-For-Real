/** Pause with the full headline visible before deleting. */
export const HOLD_MS = 4000;

/**
 * Per-character delay. Typing is slower and more jittered than delete.
 * `random` is injectable so tests can pin the distribution.
 */
export function nextCharDelay(
  mode: "type" | "delete",
  random: () => number = Math.random,
): number {
  const sample = random();
  if (mode === "type") {
    return 70 + sample * 50;
  }
  return 32 + sample * 24;
}

/**
 * True when a MEASURE prompt has nothing to show besides the shared
 * Continue chrome (e.g. "Continue" / "Continue."). Cosmetic — callers still
 * send the same NEXT the Continue button would.
 */
export function isSilentMeasurePrompt(
  prompt: string,
  continueLabel: string,
): boolean {
  const normalizedPrompt = normalizeChromePhrase(prompt);
  if (normalizedPrompt.length === 0) {
    return true;
  }
  return normalizedPrompt === normalizeChromePhrase(continueLabel);
}

function normalizeChromePhrase(value: string): string {
  return value.trim().replace(/[.!?]+$/u, "").trim().toLocaleLowerCase();
}

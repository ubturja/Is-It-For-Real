/** Token the model is allowed to see. Never a user-typed name. */
export const NAME_TOKEN = "{{name}}";

/**
 * Square-bracket name slots in canned templates (longest first so
 * "[your name or anonymous]" is not partially eaten by "[your name]").
 */
const NAME_BRACKETS = [
  "[school contact's name / role]",
  "[your name or anonymous]",
  "[trusted adult's name]",
  "[classmate's name]",
  "[your name]",
] as const;

export function withNameToken(templateBody: string): string {
  let result = templateBody;
  for (const bracket of NAME_BRACKETS) {
    result = result.split(bracket).join(NAME_TOKEN);
  }
  return result;
}

/** Client-only: swap {{name}} / canned name slots for the typed value. */
export function applyLocalName(body: string, name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return body.split(NAME_TOKEN).join("[name]");
  }
  return withNameToken(body).split(NAME_TOKEN).join(trimmed);
}

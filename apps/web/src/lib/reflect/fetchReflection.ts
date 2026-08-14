import { validateReflectionReport, type ReflectionReport } from "@isitfr/schemas";

export function reflectionUrl(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/reflect`;
}

/**
 * POST P7.1 reflect. The response is the schema-valid report object.
 */
export async function fetchReflection(
  sessionId: string,
): Promise<ReflectionReport> {
  const response = await fetch(reflectionUrl(sessionId), { method: "POST" });
  const body: unknown = await readJson(response);
  if (!response.ok) {
    throw new Error("reflection_unavailable");
  }
  return validateReflectionReport(body);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

import {
  PersonalizeTemplateResponseSchema,
  type PersonalizeTemplateContext,
  type PersonalizeTemplateResponse,
} from "@isitfr/schemas";

export const PERSONALIZE_TEMPLATE_PATH = "/api/crisis/personalize-template";
export const PERSONALIZE_CLIENT_TIMEOUT_MS = 6_000;

export async function requestPersonalizedTemplate(
  templateKey: string,
  context: PersonalizeTemplateContext,
  signal?: AbortSignal,
): Promise<PersonalizeTemplateResponse> {
  const response = await fetch(PERSONALIZE_TEMPLATE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateKey, context }),
    signal,
  });
  const body: unknown = await readJson(response);
  if (!response.ok) {
    throw new Error("personalize_unavailable");
  }
  return PersonalizeTemplateResponseSchema.parse(body);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

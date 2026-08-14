import { z } from "zod";

/** Bounded optional context — name is never forwarded to the model. */
export const PersonalizeTemplateContextSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const PersonalizeTemplateRequestSchema = z
  .object({
    templateKey: z.string().min(1).max(120),
    context: PersonalizeTemplateContextSchema.optional().default({}),
  })
  .strict();

export const PersonalizeTemplateResponseSchema = z
  .object({
    title: z.string().min(1),
    body: z.string().min(1),
  })
  .strict();

export type PersonalizeTemplateContext = z.infer<
  typeof PersonalizeTemplateContextSchema
>;
export type PersonalizeTemplateRequest = z.infer<
  typeof PersonalizeTemplateRequestSchema
>;
export type PersonalizeTemplateResponse = z.infer<
  typeof PersonalizeTemplateResponseSchema
>;

/**
 * Payload the model is allowed to see: already-fixed template text with a
 * neutral {{name}} token. User-typed names must never appear here.
 */
export const PersonalizeTemplatePromptSchema = z
  .object({
    template: z.string().min(1),
  })
  .strict();

export type PersonalizeTemplatePrompt = z.infer<
  typeof PersonalizeTemplatePromptSchema
>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function validatePersonalizeTemplateRequest(
  json: unknown,
): PersonalizeTemplateRequest {
  const result = PersonalizeTemplateRequestSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid personalize-template request:\n${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
}

export function validatePersonalizeTemplateResponse(
  json: unknown,
): PersonalizeTemplateResponse {
  const result = PersonalizeTemplateResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid personalize-template response:\n${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
}

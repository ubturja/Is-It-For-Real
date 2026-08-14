import { openai } from "@ai-sdk/openai";
import { getMessageTemplate } from "@isitfr/content-config";
import {
  PersonalizeTemplatePromptSchema,
  PersonalizeTemplateResponseSchema,
  type PersonalizeTemplateContext,
  type PersonalizeTemplateResponse,
} from "@isitfr/schemas";
import { generateObject } from "ai";
import { z } from "zod";

export const PERSONALIZE_MODEL_ID = "gpt-4o-mini";
export const PERSONALIZE_SERVER_TIMEOUT_MS = 8_000;

/**
 * Bound to rewording a fixed template. Must never ask the model to invent
 * crisis steps, advice, or resources.
 */
export const PERSONALIZE_SYSTEM_PROMPT = `You rewrite a fixed crisis message template into more natural language.

You are given the complete template. You may only reword that text.
You must not:
- invent new steps, advice, or resources
- tell the reader what to do beyond what the template already says
- add, remove, or change the meaning of the message
- mention that you are an AI

If a name is provided, substitute it only into existing [square-bracket] placeholders. Leave any placeholder as-is when no matching context was provided.`;

const PersonalizedBodySchema = z
  .object({
    body: z.string().min(1),
  })
  .strict();

export function serializePersonalizePrompt(
  templateBody: string,
  context: PersonalizeTemplateContext,
): string {
  const payload = PersonalizeTemplatePromptSchema.parse({
    template: templateBody,
    context,
  });
  return JSON.stringify(payload);
}

export async function personalizeTemplate(
  templateKey: string,
  context: PersonalizeTemplateContext,
): Promise<PersonalizeTemplateResponse> {
  const source = getMessageTemplate(templateKey);
  const prompt = serializePersonalizePrompt(source.body, context);
  const { object } = await generateObject({
    model: openai(PERSONALIZE_MODEL_ID),
    schema: PersonalizedBodySchema,
    system: PERSONALIZE_SYSTEM_PROMPT,
    prompt,
    abortSignal: AbortSignal.timeout(PERSONALIZE_SERVER_TIMEOUT_MS),
  });
  return PersonalizeTemplateResponseSchema.parse({
    title: source.title ?? source.key,
    body: object.body,
  });
}

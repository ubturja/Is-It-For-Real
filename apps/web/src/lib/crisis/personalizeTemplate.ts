import { groq } from "@ai-sdk/groq";
import { getMessageTemplate } from "@isitfr/content-config";
import {
  PersonalizeTemplatePromptSchema,
  PersonalizeTemplateResponseSchema,
  type PersonalizeTemplateResponse,
} from "@isitfr/schemas";
import { generateObject } from "ai";
import { z } from "zod";

import {
  GROQ_GENERATE_MAX_RETRIES,
  isProviderRateLimitError,
} from "@/lib/ai/groqLimits";
import { NAME_TOKEN, withNameToken } from "@/lib/crisis/namePlaceholder";

export const PERSONALIZE_MODEL_ID = "llama-3.3-70b-versatile";
export const PERSONALIZE_SERVER_TIMEOUT_MS = 8_000;

/**
 * Bound to rewording a fixed template. Must never ask the model to invent
 * crisis steps, advice, or resources. Must never receive a real name.
 */
export const PERSONALIZE_SYSTEM_PROMPT = `You rewrite a fixed crisis message template into more natural language.

You are given the complete template. You may only reword that text.
You must not:
- invent new steps, advice, or resources
- tell the reader what to do beyond what the template already says
- add, remove, or change the meaning of the message
- mention that you are an AI
- replace, drop, or invent a person's name

Keep the ${NAME_TOKEN} token exactly where a name belongs. Do not substitute a real name.`;

const PersonalizedBodySchema = z
  .object({
    body: z.string().min(1),
  })
  .strict();

export function serializePersonalizePrompt(templateBody: string): string {
  const payload = PersonalizeTemplatePromptSchema.parse({
    template: withNameToken(templateBody),
  });
  return JSON.stringify(payload);
}

export async function personalizeTemplate(
  templateKey: string,
): Promise<PersonalizeTemplateResponse> {
  const source = getMessageTemplate(templateKey);
  const prompt = serializePersonalizePrompt(source.body);
  let object;
  try {
    ({ object } = await generateObject({
      model: groq(PERSONALIZE_MODEL_ID),
      schema: PersonalizedBodySchema,
      system: PERSONALIZE_SYSTEM_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(PERSONALIZE_SERVER_TIMEOUT_MS),
      maxRetries: GROQ_GENERATE_MAX_RETRIES,
    }));
  } catch (err) {
    if (isProviderRateLimitError(err)) {
      throw new Error("groq_rate_limited");
    }
    throw err;
  }
  return PersonalizeTemplateResponseSchema.parse({
    title: source.title ?? source.key,
    body: object.body,
  });
}

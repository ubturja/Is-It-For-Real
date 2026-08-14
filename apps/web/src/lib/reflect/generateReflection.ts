import { openai } from "@ai-sdk/openai";
import {
  ReflectionPromptPayloadSchema,
  ReflectionReportSchema,
  type ReflectionPromptMetric,
  type ReflectionReport,
} from "@isitfr/schemas";
import { generateObject } from "ai";

export const REFLECTION_MODEL_ID = "gpt-4o-mini";

/**
 * Bound the model to scores + descriptions. Explicitly forbid judgment,
 * diagnosis, and claims that cannot be read off the provided numbers.
 */
export const REFLECTION_SYSTEM_PROMPT = `You write a brief, supportive reflection from metric scores and their descriptions only.

You must not:
- use judgmental language
- diagnose the user
- invent any claim that cannot be derived from the provided scores

You cannot see what the user did or said. Do not describe specific actions, choices, quotes, or free-text input. If a point is not implied by a score and its description, omit it.

Tone must be supportive.`;

export function serializeReflectionPrompt(
  metrics: ReflectionPromptMetric[],
): string {
  const payload = ReflectionPromptPayloadSchema.parse({ metrics });
  return JSON.stringify(payload);
}

export async function generateReflection(
  metrics: ReflectionPromptMetric[],
): Promise<{ report: ReflectionReport; model_used: string }> {
  const prompt = serializeReflectionPrompt(metrics);
  const { object } = await generateObject({
    model: openai(REFLECTION_MODEL_ID),
    schema: ReflectionReportSchema,
    system: REFLECTION_SYSTEM_PROMPT,
    prompt,
  });
  return {
    report: ReflectionReportSchema.parse(object),
    model_used: REFLECTION_MODEL_ID,
  };
}

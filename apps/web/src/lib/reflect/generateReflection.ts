import { groq } from "@ai-sdk/groq";
import {
  ReflectionPromptPayloadSchema,
  ReflectionReportSchema,
  type ReflectionPromptMetric,
  type ReflectionReport,
} from "@isitfr/schemas";
import { generateObject } from "ai";

import {
  GROQ_GENERATE_MAX_RETRIES,
  isProviderRateLimitError,
} from "@/lib/ai/groqLimits";

export const REFLECTION_MODEL_ID = "llama-3.3-70b-versatile";
/** Stored on `reports.model_used` — Groq-identifiable, not the bare model slug. */
export const REFLECTION_MODEL_USED = `groq/${REFLECTION_MODEL_ID}`;

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
  let object;
  try {
    ({ object } = await generateObject({
      model: groq(REFLECTION_MODEL_ID),
      schema: ReflectionReportSchema,
      system: REFLECTION_SYSTEM_PROMPT,
      prompt,
      maxRetries: GROQ_GENERATE_MAX_RETRIES,
    }));
  } catch (err) {
    if (isProviderRateLimitError(err)) {
      throw new Error("groq_rate_limited");
    }
    throw err;
  }
  return {
    report: ReflectionReportSchema.parse(object),
    model_used: REFLECTION_MODEL_USED,
  };
}

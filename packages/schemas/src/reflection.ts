import { z } from "zod";

/**
 * Only what the reflection model is allowed to see: a score and the
 * scoring-rule description for that metric. Extra keys are rejected so
 * interaction rows / free text cannot be forwarded by accident.
 */
export const ReflectionPromptMetricSchema = z
  .object({
    metric: z.string().min(1),
    value: z.number().finite(),
    description: z.string().min(1),
  })
  .strict();

export const ReflectionPromptPayloadSchema = z
  .object({
    metrics: z.array(ReflectionPromptMetricSchema),
  })
  .strict();

export type ReflectionPromptMetric = z.infer<typeof ReflectionPromptMetricSchema>;
export type ReflectionPromptPayload = z.infer<typeof ReflectionPromptPayloadSchema>;

/** Structured reflection written to `reports.content`. No step graph. */
export const ReflectionReportSchema = z
  .object({
    summary: z.string(),
    strengths: z.array(z.string()),
    growthAreas: z.array(z.string()),
    tone: z.literal("supportive"),
  })
  .strict();

export type ReflectionReport = z.infer<typeof ReflectionReportSchema>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function validateReflectionPromptPayload(
  json: unknown,
): ReflectionPromptPayload {
  const result = ReflectionPromptPayloadSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid reflection prompt payload:\n${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
}

export function validateReflectionReport(json: unknown): ReflectionReport {
  const result = ReflectionReportSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid ReflectionReport:\n${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
}

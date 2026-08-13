import { z } from "zod";

/**
 * Shared UI chrome for step components — per-step-type defaults, not per-flow.
 * Scenario copy stays on the flow JSON (`prompt`, `why`, option labels).
 */
export const StepChromeSchema = z.object({
  locale: z.string(),
  stepTypes: z.object({
    STOP: z.object({ title: z.string() }),
    PRESERVE: z.object({ title: z.string() }),
    BRANCH: z.object({ title: z.string() }),
    MEASURE: z.object({ title: z.string() }),
    TEMPLATE: z.object({ titleFallback: z.string() }),
    RESOURCES: z.object({
      eyebrow: z.string(),
      titleFallback: z.string(),
    }),
  }),
  empty: z.object({
    resources: z.string(),
    template: z.string(),
  }),
  actions: z.object({
    continue: z.string(),
    finish: z.string(),
    open: z.string(),
    copy: z.string(),
    copied: z.string(),
  }),
});

export type StepChrome = z.infer<typeof StepChromeSchema>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function validateStepChrome(json: unknown): StepChrome {
  const result = StepChromeSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid StepChrome:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

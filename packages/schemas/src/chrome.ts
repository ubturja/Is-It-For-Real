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
    TEMPLATE: z.object({
      titleFallback: z.string(),
      nameLabel: z.string(),
      namePlaceholder: z.string(),
    }),
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

export const ProfileChromeSchema = z.object({
  locale: z.string(),
  title: z.string(),
  intro: z.string(),
  empty: z.object({
    title: z.string(),
    body: z.string(),
    action: z.string(),
  }),
});

export type ProfileChrome = z.infer<typeof ProfileChromeSchema>;

/** Shared reflection-report chrome — not per-experiment, not a warning. */
export const ReportChromeSchema = z.object({
  locale: z.string(),
  title: z.string().min(1),
  intro: z.string().min(1),
  strengths: z.string().min(1),
  growthAreas: z.string().min(1),
  regenerate: z.string().min(1),
  regenerating: z.string().min(1),
  regenerateWait: z.string().min(1),
  loading: z.string().min(1),
  unavailable: z.string().min(1),
  back: z.string().min(1),
});

export type ReportChrome = z.infer<typeof ReportChromeSchema>;

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

export function validateProfileChrome(json: unknown): ProfileChrome {
  const result = ProfileChromeSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid ProfileChrome:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

export function validateReportChrome(json: unknown): ReportChrome {
  const result = ReportChromeSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid ReportChrome:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

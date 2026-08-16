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
    MEASURE: z.object({
      title: z
        .string()
        .min(1)
        .refine((value) => value.trim().toLowerCase() !== "measure", {
          message: 'MEASURE chrome must not be the word "Measure"',
        }),
    }),
    TEMPLATE: z.object({
      titleFallback: z.string(),
      nameLabel: z.string(),
      namePlaceholder: z.string(),
      personalize: z.string().min(1),
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
  persist: z.object({
    unsaved: z.string().min(1),
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

/** Train dashboard chrome — listing copy and the /login account note. */
export const DashboardChromeSchema = z.object({
  locale: z.string(),
  title: z.string().min(1),
  intro: z.string().min(1),
  profile: z.string().min(1),
  account: z.string().min(1),
});

export type DashboardChrome = z.infer<typeof DashboardChromeSchema>;

/** Home landing chrome — hero, explainer, path entries, and footer. */
export const LandingChromeSchema = z.object({
  locale: z.string(),
  hero: z.object({
    headline: z.string().min(1),
    subline: z.string().min(1),
  }),
  explainer: z
    .array(
      z.object({
        eyebrow: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .length(3),
  entries: z
    .array(
      z.object({
        kind: z.enum(["practice", "help"]),
        eyebrow: z.string().min(1),
        body: z.string().min(1),
        action: z.string().min(1),
      }),
    )
    .length(2)
    .refine(
      (entries) =>
        entries.some((entry) => entry.kind === "practice") &&
        entries.some((entry) => entry.kind === "help"),
      { message: "entries must include practice and help" },
    ),
  footer: z.object({
    wordmark: z.string().min(1),
    practice: z.string().min(1),
    help: z.string().min(1),
    note: z.string().min(1),
  }),
});

export type LandingChrome = z.infer<typeof LandingChromeSchema>;

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

export function validateDashboardChrome(json: unknown): DashboardChrome {
  const result = DashboardChromeSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid DashboardChrome:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

export function validateLandingChrome(json: unknown): LandingChrome {
  const result = LandingChromeSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid LandingChrome:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

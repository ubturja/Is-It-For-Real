import { z } from "zod";

export const StepTypeEnum = z.enum([
  "STOP",
  "PRESERVE",
  "BRANCH",
  "TEMPLATE",
  "RESOURCES",
  "MEASURE",
]);

export const StepOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  next: z.string(), // target step key
});

export const StepSchema = z
  .object({
    type: StepTypeEnum,
    prompt: z.string(),
    why: z.string().optional(),
    templateKey: z.string().optional(), // TEMPLATE steps
    resourceSet: z.string().optional(), // RESOURCES steps
    // MEASURE: metric required, weight optional (Phase 6 analytics consumes these).
    metric: z.string().optional(),
    weight: z.number().optional(),
    options: z.array(StepOptionSchema).optional(), // BRANCH steps
    next: z.string().optional(), // linear steps
    // Generic stimulus the engine ignores. Stricter shapes are validated
    // at the component that renders them, not here.
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((step, ctx) => {
    if (step.type === "MEASURE") {
      if (step.metric === undefined || step.metric.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["metric"],
          message: 'MEASURE steps require "metric"',
        });
      }
    }
  });

type StepShape = z.infer<typeof StepSchema>;

function outgoingStepKeys(step: StepShape): string[] {
  const targets: string[] = [];
  if (step.next !== undefined) {
    targets.push(step.next);
  }
  for (const option of step.options ?? []) {
    targets.push(option.next);
  }
  return targets;
}

/**
 * DFS from `initial`. Returns the cycle as [v0, v1, ..., v0] or null.
 * Diamonds (two branches joining later) are not cycles.
 */
function findCycleFromInitial(
  initial: string,
  steps: Record<string, StepShape>,
): string[] | null {
  if (!(initial in steps)) {
    return null;
  }

  const onPath = new Set<string>();
  const done = new Set<string>();
  const path: string[] = [];

  const visit = (key: string): string[] | null => {
    if (onPath.has(key)) {
      const start = path.indexOf(key);
      return [...path.slice(start), key];
    }
    if (done.has(key)) {
      return null;
    }

    const step = steps[key];
    if (step === undefined) {
      return null;
    }

    onPath.add(key);
    path.push(key);

    for (const target of outgoingStepKeys(step)) {
      const cycle = visit(target);
      if (cycle !== null) {
        return cycle;
      }
    }

    path.pop();
    onPath.delete(key);
    done.add(key);
    return null;
  };

  return visit(initial);
}

export const FlowConfigSchema = z
  .object({
    flowId: z.string(),
    version: z.number().int().positive(),
    type: z.enum(["crisis", "experiment"]),
    title: z.string(),
    // Dashboard listing (experiments): track + teaser, never spoil "what it tests".
    track: z.string().optional(),
    teaser: z.string().optional(),
    // Presentation only — ignored by the engine. "chat-bubble" restyles
    // StepRenderer output; it is not a step type.
    skin: z.enum(["chat-bubble"]).optional(),
    // Dashboard listing. Omitted → listed. Dev stubs set false so /train
    // only shows real scored experiments; getFlow still loads them.
    listed: z.boolean().optional(),
    initial: z.string(),
    steps: z.record(z.string(), StepSchema), // keyed dynamically — no hardcoded step list anywhere
  })
  .superRefine((config, ctx) => {
    if (config.type === "experiment") {
      if (config.track === undefined || config.track.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["track"],
          message: 'experiment flows require "track"',
        });
      }
      if (config.teaser === undefined || config.teaser.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teaser"],
          message: 'experiment flows require "teaser"',
        });
      }
    }

    const stepKeys = new Set(Object.keys(config.steps));

    if (!stepKeys.has(config.initial)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["initial"],
        message: `initial step "${config.initial}" does not exist in steps`,
      });
    }

    for (const [stepKey, step] of Object.entries(config.steps)) {
      if (step.next !== undefined && !stepKeys.has(step.next)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", stepKey, "next"],
          message: `next "${step.next}" does not exist in steps`,
        });
      }

      step.options?.forEach((option, index) => {
        if (!stepKeys.has(option.next)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["steps", stepKey, "options", index, "next"],
            message: `Option next "${option.next}" does not exist in steps`,
          });
        }
      });
    }

    const cycle = findCycleFromInitial(config.initial, config.steps);
    if (cycle !== null) {
      const cyclePath = cycle.join(" → ");
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps", cycle[0] ?? config.initial],
        message: `cycle detected: ${cyclePath}`,
      });
    }
  });

export type FlowConfig = z.infer<typeof FlowConfigSchema>;
export type Step = z.infer<typeof StepSchema>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function validateFlowConfig(json: unknown): FlowConfig {
  const result = FlowConfigSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid FlowConfig:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

import { z } from "zod";

/**
 * How to combine MEASURE observations already recorded on a flow.
 * Rules never declare new metrics — `metric` must name one emitted by a MEASURE step.
 */
export const ScoringAggregationEnum = z.enum(["sum", "average", "last"]);

export const ScoringRuleSchema = z
  .object({
    metric: z.string().min(1),
    aggregation: ScoringAggregationEnum,
    normalizeToRange: z.tuple([z.number(), z.number()]),
    description: z.string().min(1),
    // Cross-session profile rollup. Omitted → average (see aggregateProfile).
    acrossSessions: ScoringAggregationEnum.optional(),
  })
  .superRefine((rule, ctx) => {
    const [low, high] = rule.normalizeToRange;
    if (low >= high) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["normalizeToRange"],
        message: "normalizeToRange requires [low, high] with low < high",
      });
    }
  });

/** One experiment file: every rule for that flow's MEASURE metrics. */
export const ScoringRulesSchema = z.array(ScoringRuleSchema).min(1);

export type ScoringRule = z.infer<typeof ScoringRuleSchema>;
export type ScoringRules = z.infer<typeof ScoringRulesSchema>;

/**
 * One MEASURE observation as scoring sees it (metric + numeric value).
 * Route handlers map `flow_interactions.step_id` / `choice_value` through
 * the flow's MEASURE steps into this shape before `computeScores`.
 */
export const FlowInteractionSchema = z.object({
  metric: z.string().min(1),
  value: z.number(),
});

export type FlowInteraction = z.infer<typeof FlowInteractionSchema>;

/** Profile dimensions rolled into `profiles.aggregated_scores`. */
export const PROFILE_DIMENSIONS = [
  "framing_bias",
  "perspective_diversity",
  "memory_reliability",
  "deepfake_resilience",
] as const;

export const ProfileDimensionSchema = z.enum(PROFILE_DIMENSIONS);
/** Open record so a future experiment's metric is stored and rendered without a schema change. */
export const AggregatedScoresSchema = z.record(z.string().min(1), z.number());

export type ProfileDimension = z.infer<typeof ProfileDimensionSchema>;
export type AggregatedScores = z.infer<typeof AggregatedScoresSchema>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function validateScoringRule(json: unknown): ScoringRule {
  const result = ScoringRuleSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid ScoringRule:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

export function validateScoringRules(json: unknown): ScoringRules {
  const result = ScoringRulesSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid ScoringRules:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

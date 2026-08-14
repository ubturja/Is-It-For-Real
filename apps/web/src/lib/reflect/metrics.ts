import { getScoringRules } from "@isitfr/content-config";
import {
  ReflectionPromptPayloadSchema,
  type ReflectionPromptMetric,
} from "@isitfr/schemas";

export type FlowScoreRow = {
  metric_name: string;
  metric_value: number;
};

export function isFlowScoreRow(row: unknown): row is FlowScoreRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  if (!("metric_name" in row) || typeof row.metric_name !== "string") {
    return false;
  }
  if (!("metric_value" in row) || typeof row.metric_value !== "number") {
    return false;
  }
  return Number.isFinite(row.metric_value);
}

/**
 * Join persisted `flow_scores` to each metric's scoring-rule `description`.
 * Never accepts interaction rows — callers must not pass them in.
 */
export function metricsForReflection(
  flowId: string,
  scores: FlowScoreRow[],
): ReflectionPromptMetric[] {
  const rules = getScoringRules(flowId);
  const descriptionByMetric = new Map(
    rules.map((rule) => [rule.metric, rule.description]),
  );

  const metrics: ReflectionPromptMetric[] = scores.map((score) => {
    const description = descriptionByMetric.get(score.metric_name);
    if (description === undefined) {
      throw new Error(
        `No scoring-rule description for metric "${score.metric_name}"`,
      );
    }
    return {
      metric: score.metric_name,
      value: score.metric_value,
      description,
    };
  });

  return ReflectionPromptPayloadSchema.parse({ metrics }).metrics;
}

import type { FlowConfig, ScoringRules } from "@isitfr/schemas";

/**
 * A rule's normalizeToRange must match the min/max MEASURE weights for that
 * metric on the same flow. Otherwise a 0–2 arm can be stored as if it were
 * already on 0–1 (framing_bias political weight 2 vs range [0, 1]).
 *
 * Metrics with no declared weights (client-supplied MEASURE values) are skipped.
 */
export function assertNormalizeToRangeMatchesWeights(
  flow: FlowConfig,
  rules: ScoringRules,
): void {
  for (const rule of rules) {
    const weights: number[] = [];
    for (const step of Object.values(flow.steps)) {
      if (
        step.type === "MEASURE" &&
        step.metric === rule.metric &&
        typeof step.weight === "number"
      ) {
        weights.push(step.weight);
      }
    }
    if (weights.length === 0) {
      continue;
    }
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const [low, high] = rule.normalizeToRange;
    if (min !== low || max !== high) {
      throw new Error(
        `${flow.flowId} rule "${rule.metric}" normalizeToRange [${low}, ${high}] does not match MEASURE weights [${min}, ${max}]`,
      );
    }
  }
}

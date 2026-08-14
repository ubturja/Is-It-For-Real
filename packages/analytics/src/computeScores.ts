import type { FlowInteraction, ScoringRule } from "@isitfr/schemas";

import { combineValues } from "./combineValues";

/**
 * Scale an aggregated value from a [0, 1] source domain onto `normalizeToRange`.
 * A range of [0, 1] is an identity map.
 */
function normalizeToRange(value: number, range: [number, number]): number {
  const [low, high] = range;
  return low + value * (high - low);
}

/**
 * Apply each scoring rule's aggregation + normalization to matching
 * interactions (same `metric`). Pure — no I/O.
 *
 * Callers must pass interactions in chronological order (`last` uses the
 * final matching value). Metrics with no matching interactions score 0.
 */
export function computeScores(
  interactions: FlowInteraction[],
  rules: ScoringRule[],
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const rule of rules) {
    const values = interactions
      .filter((interaction) => interaction.metric === rule.metric)
      .map((interaction) => interaction.value);
    const aggregated = combineValues(values, rule.aggregation);
    scores[rule.metric] = normalizeToRange(aggregated, rule.normalizeToRange);
  }

  return scores;
}

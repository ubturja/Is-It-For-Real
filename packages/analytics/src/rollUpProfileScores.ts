import type { AggregatedScores, ScoringRule } from "@isitfr/schemas";

import { combineValues } from "./combineValues";

export type ProfileScoreEntry = {
  metric: string;
  value: number;
};

/**
 * Rolling profile from per-session `flow_scores`.
 *
 * Default per dimension is **average** across sessions. Pass `acrossSessions`
 * from the metric's scoring rule to override (`sum` / `last`).
 *
 * `entries` must be chronological (`last` uses the final value per metric).
 * Dimensions with no entries are omitted. Every metric present in `entries`
 * is included — the chart reads this set from the data.
 */
export function rollUpProfileScores(
  entries: ProfileScoreEntry[],
  acrossSessions: Partial<
    Record<string, ScoringRule["aggregation"]>
  > = {},
): AggregatedScores {
  const byMetric = new Map<string, number[]>();

  for (const entry of entries) {
    const bucket = byMetric.get(entry.metric);
    if (bucket === undefined) {
      byMetric.set(entry.metric, [entry.value]);
    } else {
      bucket.push(entry.value);
    }
  }

  const scores: AggregatedScores = {};
  for (const [metric, values] of byMetric) {
    const aggregation = acrossSessions[metric] ?? "average";
    scores[metric] = combineValues(values, aggregation);
  }
  return scores;
}

import { type AggregatedScores } from "@isitfr/schemas";
import { rollUpProfileScores } from "@isitfr/analytics";
import { profileAggregationFor } from "@isitfr/content-config";

export type SessionForRollup = {
  id: string;
  completed_at: string | null;
  started_at: string;
};

export type ScoreRow = {
  session_id: string;
  metric_name: string;
  metric_value: number;
};

function sessionTime(session: SessionForRollup): number {
  const stamp = session.completed_at ?? session.started_at;
  const parsed = Date.parse(stamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Chronological metric values so `acrossSessions: "last"` is well-defined. */
export function orderedMetricValues(
  sessions: SessionForRollup[],
  scores: ScoreRow[],
): Array<{ metric: string; value: number }> {
  const orderedSessions = [...sessions].sort(
    (a, b) => sessionTime(a) - sessionTime(b),
  );
  const entries: Array<{ metric: string; value: number }> = [];
  for (const session of orderedSessions) {
    for (const score of scores) {
      if (score.session_id !== session.id) {
        continue;
      }
      entries.push({ metric: score.metric_name, value: score.metric_value });
    }
  }
  return entries;
}

export function aggregationsFromRules(
  metrics: string[],
): Partial<Record<string, "sum" | "average" | "last">> {
  const aggregations: Partial<Record<string, "sum" | "average" | "last">> = {};
  for (const metric of metrics) {
    aggregations[metric] = profileAggregationFor(metric);
  }
  return aggregations;
}

export function aggregatedScoresFromRows(
  sessions: SessionForRollup[],
  scores: ScoreRow[],
): AggregatedScores {
  const entries = orderedMetricValues(sessions, scores);
  const metrics = [...new Set(entries.map((entry) => entry.metric))];
  return rollUpProfileScores(entries, aggregationsFromRules(metrics));
}

import { listFlows } from "@isitfr/content-config";
import type { AggregatedScores } from "@isitfr/schemas";

export type RadarAxis = {
  metric: string;
  label: string;
  value: number;
};

function humanizeMetric(metric: string): string {
  return metric.replaceAll("_", " ");
}

/**
 * Axis labels from experiment tracks (data), not a hardcoded dimension list.
 * A future flow's MEASURE metric picks up that flow's `track`.
 */
export function metricLabelsFromFlows(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const flow of listFlows({ type: "experiment" })) {
    if (flow.track === undefined || flow.track.trim() === "") {
      continue;
    }
    for (const step of Object.values(flow.steps)) {
      if (step.type === "MEASURE" && step.metric !== undefined) {
        const metric = step.metric;
        if (labels[metric] === undefined) {
          labels[metric] = flow.track;
        }
      }
    }
  }
  return labels;
}

/**
 * Radar axes from whatever keys are present in aggregated_scores.
 * Empty object → no axes (callers must show the empty state, not a blank chart).
 */
export function radarAxesFromScores(
  scores: AggregatedScores,
  labels: Record<string, string> = metricLabelsFromFlows(),
): RadarAxis[] {
  return Object.entries(scores)
    .filter(([, value]) => Number.isFinite(value))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([metric, value]) => ({
      metric,
      label: labels[metric] ?? humanizeMetric(metric),
      value,
    }));
}

import type { FlowConfig, Step } from "@isitfr/schemas";

function outgoing(step: Step): string[] {
  if (step.type === "BRANCH") {
    return (step.options ?? []).map((option) => option.next);
  }
  if (step.next !== undefined) {
    return [step.next];
  }
  return [];
}

/**
 * True when recorded MEASURE step ids cover at least one path from
 * `initial` to a final step (no outgoing transition). BRANCH choices are
 * not persisted, so every BRANCH option is tried; a path is complete only
 * if every MEASURE on that path was recorded.
 *
 * Used to refuse scoring partial runs and to recover sessions left
 * `in_progress` after the client closed before POST /score.
 */
export function hasCompletedMeasurePath(
  config: FlowConfig,
  recordedStepIds: readonly string[],
): boolean {
  const recorded = new Set(recordedStepIds);

  function walk(stepId: string, seen: ReadonlySet<string>): boolean {
    if (seen.has(stepId)) {
      return false;
    }
    const step = config.steps[stepId];
    if (step === undefined) {
      return false;
    }
    if (step.type === "MEASURE" && !recorded.has(stepId)) {
      return false;
    }
    const nextSeen = new Set(seen);
    nextSeen.add(stepId);
    const targets = outgoing(step);
    if (targets.length === 0) {
      return true;
    }
    return targets.some((target) => walk(target, nextSeen));
  }

  return walk(config.initial, new Set());
}

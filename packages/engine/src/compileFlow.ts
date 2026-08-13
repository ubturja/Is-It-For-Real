import { assign, createMachine, type AssignAction } from "xstate";
import type { FlowConfig, Step } from "@isitfr/schemas";

/** One recorded observation from a MEASURE step (process side of input→process→output). */
export type Measurement = {
  metric: string;
  value: number;
};

export interface FlowContext {
  sessionId: string;
  answers: Record<string, string>;
  startedAt: string;
  /** Accumulated MEASURE observations; Analytics Engine (Phase 6) will consume these. */
  measurements: Measurement[];
}

export type FlowEvent =
  | { type: "NEXT"; value?: number }
  | { type: string; value?: number };

type TransitionTarget =
  | string
  | {
      target: string;
      actions: AssignAction<FlowContext, FlowEvent>;
    };

const LINEAR_STEP_TYPES = new Set([
  "STOP",
  "PRESERVE",
  "TEMPLATE",
  "RESOURCES",
  "MEASURE",
]);

/**
 * Engine graph contract (applies to every flow — crisis and experiments):
 *
 * 1. Dangling references FAIL FAST.
 *    Every `next` / option `next` must name an existing step key.
 *    The compiler must not emit a transition into a missing state (dead-end /
 *    silent no-op). Schema validation also checks this; the compiler re-checks
 *    so a bypassed or stale boundary cannot produce a broken machine.
 *
 * 2. Self-loops FAIL FAST.
 *    A step must not transition to itself via `next` or a BRANCH option.
 *    IsItFR / crisis flows must never loop — progress is one-way.
 *    (Multi-hop cycles A→B→A are not yet rejected here; that is a known gap.)
 *
 * 3. Untargeted steps WARN, do not fail.
 *    A step present in `steps` but never referenced by `initial`, any `next`,
 *    or any option may be an intentional stretch / alternate entry. Warn so
 *    authors notice it; do not block compile.
 */
function assertFlowGraph(config: FlowConfig): void {
  const stepKeys = new Set(Object.keys(config.steps));
  const targeted = new Set<string>();

  if (stepKeys.has(config.initial)) {
    targeted.add(config.initial);
  }

  for (const [stepKey, step] of Object.entries(config.steps)) {
    if (step.next !== undefined) {
      if (!stepKeys.has(step.next)) {
        throw new Error(
          `Flow graph error: step "${stepKey}" has next "${step.next}" which does not exist in steps`,
        );
      }
      if (step.next === stepKey) {
        throw new Error(
          `Flow graph error: step "${stepKey}" has next pointing to itself — flows must not loop`,
        );
      }
      targeted.add(step.next);
    }

    step.options?.forEach((option, index) => {
      if (!stepKeys.has(option.next)) {
        throw new Error(
          `Flow graph error: BRANCH option "${option.value}" on step "${stepKey}" (options[${index}]) targets nonexistent step "${option.next}"`,
        );
      }
      if (option.next === stepKey) {
        throw new Error(
          `Flow graph error: BRANCH option "${option.value}" on step "${stepKey}" targets itself — flows must not loop`,
        );
      }
      targeted.add(option.next);
    });
  }

  for (const stepKey of Array.from(stepKeys)) {
    if (!targeted.has(stepKey)) {
      // Contract §3: warn only — stretch / unused steps are allowed.
      console.warn(
        `Flow graph warning: step "${stepKey}" is never targeted by initial, next, or any BRANCH option (may be an intentional stretch step)`,
      );
    }
  }
}

function measurementValueFromEvent(
  event: FlowEvent,
  weight: number | undefined,
): number {
  if (typeof event.value === "number") {
    return event.value;
  }
  if (typeof weight === "number") {
    return weight;
  }
  return 0;
}

function transitionsForStep(
  step: Step,
): Record<string, TransitionTarget> | undefined {
  if (step.type === "BRANCH") {
    if (!step.options || step.options.length === 0) {
      return undefined;
    }
    const on: Record<string, TransitionTarget> = {};
    for (const option of step.options) {
      on[option.value] = option.next;
    }
    return on;
  }

  if (step.type === "MEASURE" && step.next !== undefined) {
    // Schema guarantees metric on MEASURE; keep a runtime guard for bypassed validation.
    const metric = step.metric;
    if (metric === undefined || metric.trim() === "") {
      throw new Error(
        `Flow graph error: MEASURE step is missing required "metric"`,
      );
    }
    return {
      NEXT: {
        target: step.next,
        actions: assign<FlowContext, FlowEvent>({
          measurements: (context, event) => [
            ...context.measurements,
            {
              metric,
              value: measurementValueFromEvent(event, step.weight),
            },
          ],
        }),
      },
    };
  }

  if (LINEAR_STEP_TYPES.has(step.type) && step.next !== undefined) {
    return { NEXT: step.next };
  }

  return undefined;
}

/**
 * Compile a FlowConfig into an XState machine.
 *
 * Callers should validate shape with `validateFlowConfig` first.
 * This function additionally enforces the engine graph contract (see
 * `assertFlowGraph`) and does not re-run the Zod schema.
 *
 * MEASURE steps advance like other linear steps (`NEXT` → `next`) and append
 * `{ metric, value }` to `context.measurements`. If NEXT has no numeric
 * `value`, `value` is `step.weight` (else 0) — BRANCH→MEASURE arms encode
 * the score in the graph, not in `context.answers`.
 */
export function compileFlowToMachine(config: FlowConfig) {
  assertFlowGraph(config);

  const states: Record<
    string,
    {
      meta: Step;
      on?: Record<string, TransitionTarget>;
      type?: "final";
    }
  > = {};

  for (const [key, step] of Object.entries(config.steps)) {
    const on = transitionsForStep(step);
    const hasTransitions = on !== undefined && Object.keys(on).length > 0;

    states[key] = {
      meta: step,
      ...(hasTransitions ? { on } : { type: "final" as const }),
    };
  }

  return createMachine({
    id: config.flowId,
    predictableActionArguments: true,
    initial: config.initial,
    context: {
      sessionId: "",
      answers: {},
      startedAt: "",
      measurements: [] as Measurement[],
    } satisfies FlowContext,
    states,
  });
}

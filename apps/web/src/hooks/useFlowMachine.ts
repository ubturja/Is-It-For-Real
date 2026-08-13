"use client";

import { getFlow } from "@isitfr/content-config";
import {
  compileFlowToMachine,
  type FlowContext,
  type Measurement,
} from "@isitfr/engine";
import type { Step } from "@isitfr/schemas";
import { useMachine } from "@xstate/react";
import { useCallback, useMemo } from "react";
import { State } from "xstate";

export type FlowResumeSnapshot = {
  stepId: string | null;
  answers?: Record<string, string>;
  startedAt?: string | null;
};

export type UseFlowMachineOptions = {
  /**
   * Optional resume snapshot (e.g. IndexedDB for crisis). Applied once at mount —
   * remount the consumer (key change) to restart or re-hydrate.
   */
  resume?: FlowResumeSnapshot;
};

export type UseFlowMachineResult = {
  flowId: string;
  step: Step | undefined;
  currentStepId: string | undefined;
  done: boolean;
  context: FlowContext;
  /**
   * Advance the machine:
   * - string → BRANCH option event
   * - number → NEXT with MEASURE value
   * - undefined → NEXT (linear steps)
   */
  onAdvance: (value?: string | number) => void;
};

function buildMachineOptions(
  machine: ReturnType<typeof compileFlowToMachine>,
  resume: FlowResumeSnapshot | undefined,
) {
  const stepId = resume?.stepId;
  const canResume =
    typeof stepId === "string" &&
    Object.prototype.hasOwnProperty.call(machine.states, stepId);

  if (canResume && stepId) {
    const context: FlowContext = {
      sessionId: "",
      answers: resume?.answers ?? {},
      startedAt: resume?.startedAt ?? "",
      measurements: [] as Measurement[],
    };
    return {
      state: machine.resolveState(State.from(stepId, context)),
    };
  }

  const context: FlowContext = {
    sessionId: "",
    answers: {},
    startedAt: new Date().toISOString(),
    measurements: [] as Measurement[],
  };
  return { context };
}

/**
 * Shared compile-and-run shell for any flowId (crisis or experiment).
 * No Crisis-Mode persistence, auth, or copy — callers own that.
 */
export function useFlowMachine(
  flowId: string,
  options?: UseFlowMachineOptions,
): UseFlowMachineResult {
  const machine = useMemo(
    () => compileFlowToMachine(getFlow(flowId)),
    [flowId],
  );

  const machineOptions = useMemo(
    () => buildMachineOptions(machine, options?.resume),
    // Snapshot resume + machine at mount; remount to apply a new snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount snapshot
    [],
  );

  const [state, send] = useMachine(machine, machineOptions);

  const currentStepId =
    typeof state.value === "string" ? state.value : undefined;
  const step = currentStepId
    ? (state.meta[`${flowId}.${currentStepId}`] as Step | undefined)
    : undefined;

  const onAdvance = useCallback(
    (value?: string | number) => {
      if (typeof value === "string") {
        send({ type: value });
        return;
      }
      if (typeof value === "number") {
        send({ type: "NEXT", value });
        return;
      }
      send({ type: "NEXT" });
    },
    [send],
  );

  return {
    flowId,
    step,
    currentStepId,
    done: Boolean(state.done),
    context: state.context,
    onAdvance,
  };
}

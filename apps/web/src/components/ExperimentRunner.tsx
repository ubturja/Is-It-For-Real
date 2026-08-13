"use client";

import { StepRenderer } from "@/components/flow-steps";
import { useFlowMachine } from "@/hooks/useFlowMachine";

export type ExperimentRunnerProps = {
  flowId: string;
};

/**
 * Shared experiment shell: load + compile + run via useFlowMachine.
 * No dashboard list, scoring, or reflection UI.
 */
export function ExperimentRunner({ flowId }: ExperimentRunnerProps) {
  const { step, currentStepId, onAdvance } = useFlowMachine(flowId);

  if (!step || !currentStepId) {
    return null;
  }

  return (
    <StepRenderer key={currentStepId} step={step} onAdvance={onAdvance} />
  );
}

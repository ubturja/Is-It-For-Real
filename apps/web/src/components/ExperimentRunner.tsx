"use client";

import { getFlow, hasScoringRules } from "@isitfr/content-config";

import { ChatBubbleTheme } from "@/components/ChatBubbleTheme";
import { ReflectionReport } from "@/components/ReflectionReport";
import { StepRenderer } from "@/components/flow-steps";
import { useExperimentSession } from "@/hooks/useExperimentSession";

export type ExperimentRunnerProps = {
  flowId: string;
};

/**
 * Shared experiment shell: load + compile + run via useExperimentSession
 * (observes useFlowMachine; persists MEASURE rows to Supabase).
 * Training-only — /help must keep using useFlowMachine directly.
 * ChatBubbleTheme is a skin around StepRenderer, not a second renderer.
 * After a scored run, the reflection report replaces the terminal step.
 */
export function ExperimentRunner({ flowId }: ExperimentRunnerProps) {
  const { step, currentStepId, onAdvance, done, sessionId, scoreStatus } =
    useExperimentSession(flowId);
  const skin = getFlow(flowId).skin;
  const showReport = done && hasScoringRules(flowId);

  if (showReport) {
    return (
      <ReflectionReport sessionId={sessionId} scoreStatus={scoreStatus} />
    );
  }

  if (!step || !currentStepId) {
    return null;
  }

  const renderer = (
    <StepRenderer key={currentStepId} step={step} onAdvance={onAdvance} />
  );

  if (skin === "chat-bubble") {
    return <ChatBubbleTheme>{renderer}</ChatBubbleTheme>;
  }

  return renderer;
}

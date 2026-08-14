"use client";

import { getFlow, getStepChrome, hasScoringRules } from "@isitfr/content-config";
import type { ReactNode } from "react";

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
  const {
    step,
    currentStepId,
    onAdvance,
    done,
    sessionId,
    scoreStatus,
    persistUnsaved,
  } = useExperimentSession(flowId);
  const skin = getFlow(flowId).skin;
  const showReport = done && hasScoringRules(flowId);

  if (showReport) {
    return (
      <PersistNotice visible={persistUnsaved}>
        <ReflectionReport sessionId={sessionId} scoreStatus={scoreStatus} />
      </PersistNotice>
    );
  }

  if (!step || !currentStepId) {
    return persistUnsaved ? <PersistNotice visible /> : null;
  }

  const renderer = (
    <StepRenderer
      key={currentStepId}
      step={step}
      onAdvance={onAdvance}
      autoAdvanceSilentMeasure={skin === "chat-bubble"}
    />
  );

  const framed =
    skin === "chat-bubble" ? (
      <ChatBubbleTheme>{renderer}</ChatBubbleTheme>
    ) : (
      renderer
    );

  return <PersistNotice visible={persistUnsaved}>{framed}</PersistNotice>;
}

function PersistNotice({
  visible,
  children,
}: {
  visible: boolean;
  children?: ReactNode;
}) {
  const chrome = getStepChrome();
  return (
    <>
      {visible ? (
        <p className="text-muted-foreground px-4 pt-4 text-sm" role="status">
          {chrome.persist.unsaved}
        </p>
      ) : null}
      {children}
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { StepRenderer } from "@/components/flow-steps";
import { Button } from "@/components/ui/button";
import { useFlowMachine } from "@/hooks/useFlowMachine";
import { useCrisisSession } from "@/lib/store/crisisSession";

const FLOW_ID = "crisis-deepfake-classmate";

function useCrisisSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        setHydrated(true);
      }
    };

    const unsub = useCrisisSession.persist.onFinishHydration(markReady);
    void Promise.resolve(useCrisisSession.persist.rehydrate()).then(markReady);

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return hydrated;
}

type HelpFlowMachineProps = {
  onStartOver: () => void;
};

function HelpFlowMachine({ onStartOver }: HelpFlowMachineProps) {
  const stepId = useCrisisSession((s) => s.stepId);
  const answers = useCrisisSession((s) => s.answers);
  const startedAt = useCrisisSession((s) => s.startedAt);
  const syncProgress = useCrisisSession((s) => s.syncProgress);
  const setAnswer = useCrisisSession((s) => s.setAnswer);

  const { step, currentStepId, context, onAdvance } = useFlowMachine(FLOW_ID, {
    resume: { stepId, answers, startedAt },
  });

  useEffect(() => {
    if (!currentStepId) {
      return;
    }
    // Answers are written via setAnswer on BRANCH; do not overwrite from machine context.
    syncProgress({
      stepId: currentStepId,
      startedAt: context.startedAt || undefined,
    });
  }, [currentStepId, context.startedAt, syncProgress]);

  const handleAdvance = useCallback(
    (value?: string | number) => {
      if (typeof value === "string" && currentStepId) {
        setAnswer(currentStepId, value);
      }
      onAdvance(value);
    },
    [currentStepId, onAdvance, setAnswer],
  );

  if (!step || !currentStepId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
          Start over
        </Button>
      </div>
      <StepRenderer key={currentStepId} step={step} onAdvance={handleAdvance} />
    </div>
  );
}

/**
 * Crisis Mode entry: shared useFlowMachine shell + IndexedDB resume/persist
 * (never to Supabase). Crisis-only UI (Start over) stays here, not in the hook.
 */
export function HelpFlow() {
  const hydrated = useCrisisSessionHydrated();
  const startOver = useCrisisSession((s) => s.startOver);
  const [runId, setRunId] = useState(0);

  const handleStartOver = useCallback(() => {
    startOver();
    setRunId((id) => id + 1);
  }, [startOver]);

  if (!hydrated) {
    return null;
  }

  return <HelpFlowMachine key={runId} onStartOver={handleStartOver} />;
}

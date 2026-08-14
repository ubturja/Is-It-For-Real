"use client";

import { getFlow } from "@isitfr/content-config";
import type { Step } from "@isitfr/schemas";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { createClient } from "@/lib/supabase/client";

import {
  useFlowMachine,
  type UseFlowMachineResult,
} from "./useFlowMachine";

export type ScoreStatus = "idle" | "pending" | "ready" | "failed";

export type ExperimentSessionResult = UseFlowMachineResult & {
  sessionId: string | null;
  scoreStatus: ScoreStatus;
};

/**
 * Training-only persistence around useFlowMachine.
 * Must never be used by /help — Crisis Mode has zero Supabase writes
 * (SYSTEM_REFERENCE.md §8 principle 4).
 */
export function useExperimentSession(flowId: string): ExperimentSessionResult {
  const flow = useFlowMachine(flowId);
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const measureStartedAtRef = useRef<number | null>(null);
  const pendingWritesRef = useRef(Promise.resolve());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scoreStatus, setScoreStatus] = useState<ScoreStatus>("idle");

  useEffect(() => {
    sessionPromiseRef.current = insertInProgressSession(flowId);
    void sessionPromiseRef.current.then((id) => {
      if (id) {
        setSessionId(id);
      }
    });
  }, [flowId]);

  useEffect(() => {
    if (flow.step?.type === "MEASURE") {
      measureStartedAtRef.current = Date.now();
      return;
    }
    measureStartedAtRef.current = null;
  }, [flow.currentStepId, flow.step?.type]);

  useEffect(() => {
    if (!flow.done) {
      return;
    }
    let cancelled = false;
    setScoreStatus("pending");
    void (async () => {
      const id = await ensureSession(sessionPromiseRef, flowId);
      if (cancelled) {
        return;
      }
      if (!id) {
        setScoreStatus("failed");
        return;
      }
      setSessionId(id);
      await pendingWritesRef.current;
      if (cancelled) {
        return;
      }
      const scored = await scoreCompletedSession(id);
      if (cancelled) {
        return;
      }
      setScoreStatus(scored ? "ready" : "failed");
    })();
    return () => {
      cancelled = true;
    };
  }, [flow.done, flowId]);

  const onAdvance = useCallback(
    (value?: string | number) => {
      if (flow.step?.type === "MEASURE" && flow.currentStepId) {
        const stepId = flow.currentStepId;
        const choice_value = measureChoiceValue(value, flow.step);
        const reaction_time_ms = reactionTimeMs(measureStartedAtRef.current);
        pendingWritesRef.current = pendingWritesRef.current.then(() =>
          ensureSession(sessionPromiseRef, flowId).then((id) => {
            if (!id) {
              return;
            }
            return insertMeasureInteraction(id, {
              stepId,
              choice_value,
              reaction_time_ms,
            });
          }),
        );
      }
      flow.onAdvance(value);
    },
    [flow, flowId],
  );

  return { ...flow, onAdvance, sessionId, scoreStatus };
}

export function measureChoiceValue(
  value: string | number | undefined,
  step: Step,
): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(step.weight ?? 0);
}

export function reactionTimeMs(
  startedAt: number | null,
  now: number = Date.now(),
): number {
  if (startedAt === null) {
    return 0;
  }
  return Math.max(0, now - startedAt);
}

function ensureSession(
  ref: MutableRefObject<Promise<string | null> | null>,
  flowId: string,
): Promise<string | null> {
  if (!ref.current) {
    ref.current = insertInProgressSession(flowId);
  }
  return ref.current;
}

function hasStringId(row: unknown): row is { id: string } {
  if (typeof row !== "object" || row === null || !("id" in row)) {
    return false;
  }
  return typeof row.id === "string";
}

async function insertInProgressSession(flowId: string): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error(
      "useExperimentSession: no authenticated user",
      userError?.message,
    );
    return null;
  }

  const { version } = getFlow(flowId);

  const { data, error } = await supabase
    .from("flow_sessions")
    .insert({
      flow_id: flowId,
      flow_version: version,
      user_id: user.id,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error || !hasStringId(data)) {
    console.error(
      "useExperimentSession: failed to start session",
      error?.message,
    );
    return null;
  }
  return data.id;
}

async function scoreCompletedSession(sessionId: string): Promise<boolean> {
  const response = await fetch(`/api/sessions/${sessionId}/score`, {
    method: "POST",
  });
  if (!response.ok) {
    console.error(
      "useExperimentSession: failed to complete and score session",
      response.status,
    );
    return false;
  }
  return true;
}

async function insertMeasureInteraction(
  sessionId: string,
  payload: {
    stepId: string;
    choice_value: string;
    reaction_time_ms: number;
  },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("flow_interactions").insert({
    session_id: sessionId,
    step_id: payload.stepId,
    choice_value: payload.choice_value,
    reaction_time_ms: payload.reaction_time_ms,
  });

  if (error) {
    console.error(
      "useExperimentSession: failed to record interaction",
      error.message,
    );
  }
}

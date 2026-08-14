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

import {
  clearPersistQueue,
  enqueueInteraction,
  loadPersistQueue,
  markNeedsScore,
  markSessionFailed,
  persistQueueIsUnsaved,
  rememberSessionId,
  replaceQueuedInteractions,
  type QueuedInteraction,
} from "@/lib/sessions/persistQueue";
import { createClient } from "@/lib/supabase/client";

import {
  useFlowMachine,
  type UseFlowMachineResult,
} from "./useFlowMachine";

export type ScoreStatus = "idle" | "pending" | "ready" | "failed";

export type ExperimentSessionResult = UseFlowMachineResult & {
  sessionId: string | null;
  scoreStatus: ScoreStatus;
  persistUnsaved: boolean;
};

/**
 * Training-only persistence around useFlowMachine.
 * Must never be used by /help — Crisis Mode has zero Supabase writes
 * (SYSTEM_REFERENCE.md §8 principle 4).
 *
 * Write failures never block the UI. They are queued, retried on the next
 * mount / next write, and surfaced via persistUnsaved.
 */
export function useExperimentSession(flowId: string): ExperimentSessionResult {
  const flow = useFlowMachine(flowId);
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const measureStartedAtRef = useRef<number | null>(null);
  const pendingWritesRef = useRef(Promise.resolve());
  const doneRef = useRef(flow.done);
  doneRef.current = flow.done;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scoreStatus, setScoreStatus] = useState<ScoreStatus>("idle");
  const [persistUnsaved, setPersistUnsaved] = useState(() =>
    persistQueueIsUnsaved(loadPersistQueue(flowId)),
  );

  const refreshUnsaved = useCallback(() => {
    setPersistUnsaved(persistQueueIsUnsaved(loadPersistQueue(flowId)));
  }, [flowId]);

  useEffect(() => {
    sessionPromiseRef.current = resumeOrStartSession(flowId).then(async (id) => {
      if (!id) {
        refreshUnsaved();
        return null;
      }
      setSessionId(id);
      await flushQueuedInteractions(flowId, id);
      const queue = loadPersistQueue(flowId);
      if (queue.needsScore) {
        const scored = await scoreCompletedSession(id);
        if (scored) {
          clearPersistQueue(flowId);
          setScoreStatus("ready");
          if (!doneRef.current) {
            const fresh = await insertInProgressSession(flowId);
            if (fresh) {
              setSessionId(fresh);
            }
            refreshUnsaved();
            return fresh;
          }
        }
      }
      refreshUnsaved();
      return id;
    });
  }, [flowId, refreshUnsaved]);

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
        markNeedsScore(flowId, true);
        refreshUnsaved();
        setScoreStatus("failed");
        return;
      }
      setSessionId(id);
      await pendingWritesRef.current;
      if (cancelled) {
        return;
      }
      await flushQueuedInteractions(flowId, id);
      const scored = await scoreCompletedSession(id);
      if (cancelled) {
        return;
      }
      if (scored) {
        markNeedsScore(flowId, false);
        clearPersistQueue(flowId);
        refreshUnsaved();
        setScoreStatus("ready");
        return;
      }
      markNeedsScore(flowId, true);
      refreshUnsaved();
      setScoreStatus("failed");
    })();
    return () => {
      cancelled = true;
    };
  }, [flow.done, flowId, refreshUnsaved]);

  const onAdvance = useCallback(
    (value?: string | number) => {
      if (flow.step?.type === "MEASURE" && flow.currentStepId) {
        const stepId = flow.currentStepId;
        const choice_value = measureChoiceValue(value, flow.step);
        const reaction_time_ms = reactionTimeMs(measureStartedAtRef.current);
        pendingWritesRef.current = pendingWritesRef.current.then(() =>
          ensureSession(sessionPromiseRef, flowId).then(async (id) => {
            const payload: QueuedInteraction = {
              stepId,
              choice_value,
              reaction_time_ms,
            };
            if (!id) {
              enqueueInteraction(flowId, payload);
              refreshUnsaved();
              return;
            }
            const written = await insertMeasureInteraction(id, payload);
            if (!written) {
              enqueueInteraction(flowId, payload);
            }
            refreshUnsaved();
          }),
        );
      }
      flow.onAdvance(value);
    },
    [flow, flowId, refreshUnsaved],
  );

  return { ...flow, onAdvance, sessionId, scoreStatus, persistUnsaved };
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
    ref.current = resumeOrStartSession(flowId).then((id) => {
      if (!id) {
        ref.current = null;
      }
      return id;
    });
  }
  return ref.current.then((id) => {
    if (!id) {
      ref.current = null;
    }
    return id;
  });
}

function hasStringId(row: unknown): row is { id: string } {
  if (typeof row !== "object" || row === null || !("id" in row)) {
    return false;
  }
  return typeof row.id === "string";
}

async function resumeOrStartSession(flowId: string): Promise<string | null> {
  const queued = loadPersistQueue(flowId);
  if (queued.sessionId) {
    const live = await sessionStatus(queued.sessionId);
    if (live === "in_progress") {
      return queued.sessionId;
    }
    clearPersistQueue(flowId);
  }
  return insertInProgressSession(flowId);
}

async function sessionStatus(sessionId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flow_sessions")
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || data === null || typeof data.status !== "string") {
    return null;
  }
  return data.status;
}

async function insertInProgressSession(flowId: string): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    markSessionFailed(flowId);
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
    markSessionFailed(flowId);
    return null;
  }
  rememberSessionId(flowId, data.id);
  return data.id;
}

async function scoreCompletedSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/score`, {
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function insertMeasureInteraction(
  sessionId: string,
  payload: QueuedInteraction,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("flow_interactions").insert({
    session_id: sessionId,
    step_id: payload.stepId,
    choice_value: payload.choice_value,
    reaction_time_ms: payload.reaction_time_ms,
  });
  return !error;
}

async function flushQueuedInteractions(
  flowId: string,
  sessionId: string,
): Promise<void> {
  const queue = loadPersistQueue(flowId);
  if (queue.interactions.length === 0) {
    return;
  }
  const remaining: QueuedInteraction[] = [];
  for (const item of queue.interactions) {
    const written = await insertMeasureInteraction(sessionId, item);
    if (!written) {
      remaining.push(item);
    }
  }
  replaceQueuedInteractions(flowId, remaining);
}

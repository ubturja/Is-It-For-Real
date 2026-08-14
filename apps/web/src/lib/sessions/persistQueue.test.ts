import { describe, expect, it } from "vitest";

import {
  clearPersistQueue,
  emptyPersistQueue,
  enqueueInteraction,
  loadPersistQueue,
  markNeedsScore,
  markSessionFailed,
  persistQueueIsUnsaved,
  persistStorageKey,
  rememberSessionId,
  replaceQueuedInteractions,
  type PersistStore,
} from "./persistQueue";

function memoryStore(): PersistStore {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

describe("persistQueue", () => {
  it("round-trips a failed write so the next mount can retry", () => {
    const store = memoryStore();
    markSessionFailed("experiment-stub", store);
    enqueueInteraction(
      "experiment-stub",
      { stepId: "probe", choice_value: "1", reaction_time_ms: 12 },
      store,
    );
    markNeedsScore("experiment-stub", true, store);

    const loaded = loadPersistQueue("experiment-stub", store);
    expect(persistQueueIsUnsaved(loaded)).toBe(true);
    expect(loaded.sessionFailed).toBe(true);
    expect(loaded.needsScore).toBe(true);
    expect(loaded.interactions).toEqual([
      { stepId: "probe", choice_value: "1", reaction_time_ms: 12 },
    ]);
  });

  it("keeps sessionId so a remount retries the same session instead of inserting another", () => {
    const store = memoryStore();
    rememberSessionId("echo-chamber", "session-1", store);
    markNeedsScore("echo-chamber", true, store);

    const loaded = loadPersistQueue("echo-chamber", store);
    expect(loaded.sessionId).toBe("session-1");
    expect(persistQueueIsUnsaved(loaded)).toBe(true);
  });

  it("clears storage when the queue is empty", () => {
    const store = memoryStore();
    markSessionFailed("experiment-stub", store);
    clearPersistQueue("experiment-stub", store);
    expect(store.getItem(persistStorageKey("experiment-stub"))).toBeNull();
    expect(loadPersistQueue("experiment-stub", store)).toEqual(
      emptyPersistQueue("experiment-stub"),
    );
  });

  it("replaces remaining interactions after a partial flush", () => {
    const store = memoryStore();
    enqueueInteraction(
      "experiment-stub",
      { stepId: "a", choice_value: "1", reaction_time_ms: 1 },
      store,
    );
    enqueueInteraction(
      "experiment-stub",
      { stepId: "b", choice_value: "0", reaction_time_ms: 2 },
      store,
    );
    replaceQueuedInteractions(
      "experiment-stub",
      [{ stepId: "b", choice_value: "0", reaction_time_ms: 2 }],
      store,
    );
    expect(loadPersistQueue("experiment-stub", store).interactions).toHaveLength(
      1,
    );
  });
});

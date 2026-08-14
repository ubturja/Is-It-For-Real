export type QueuedInteraction = {
  stepId: string;
  choice_value: string;
  reaction_time_ms: number;
};

export type PersistQueue = {
  flowId: string;
  sessionId: string | null;
  sessionFailed: boolean;
  interactions: QueuedInteraction[];
  needsScore: boolean;
};

export type PersistStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const KEY_PREFIX = "isitfr:experiment-persist:";

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

const fallbackStore = memoryStore();

function defaultStore(): PersistStore {
  if (typeof sessionStorage === "undefined") {
    return fallbackStore;
  }
  return sessionStorage;
}

export function persistStorageKey(flowId: string): string {
  return `${KEY_PREFIX}${flowId}`;
}

export function emptyPersistQueue(flowId: string): PersistQueue {
  return {
    flowId,
    sessionId: null,
    sessionFailed: false,
    interactions: [],
    needsScore: false,
  };
}

export function persistQueueIsUnsaved(queue: PersistQueue): boolean {
  return (
    queue.sessionFailed || queue.interactions.length > 0 || queue.needsScore
  );
}

function isQueuedInteraction(value: unknown): value is QueuedInteraction {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("stepId" in value) || typeof value.stepId !== "string") {
    return false;
  }
  if (!("choice_value" in value) || typeof value.choice_value !== "string") {
    return false;
  }
  return (
    "reaction_time_ms" in value && typeof value.reaction_time_ms === "number"
  );
}

function isPersistQueue(value: unknown, flowId: string): value is PersistQueue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("flowId" in value) || value.flowId !== flowId) {
    return false;
  }
  if (!("sessionId" in value)) {
    return false;
  }
  if (value.sessionId !== null && typeof value.sessionId !== "string") {
    return false;
  }
  if (!("sessionFailed" in value) || typeof value.sessionFailed !== "boolean") {
    return false;
  }
  if (!("needsScore" in value) || typeof value.needsScore !== "boolean") {
    return false;
  }
  if (!("interactions" in value) || !Array.isArray(value.interactions)) {
    return false;
  }
  return value.interactions.every(isQueuedInteraction);
}

export function loadPersistQueue(
  flowId: string,
  store: PersistStore = defaultStore(),
): PersistQueue {
  const raw = store.getItem(persistStorageKey(flowId));
  if (raw === null) {
    return emptyPersistQueue(flowId);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isPersistQueue(parsed, flowId)) {
      return parsed;
    }
  } catch {
    return emptyPersistQueue(flowId);
  }
  return emptyPersistQueue(flowId);
}

export function savePersistQueue(
  queue: PersistQueue,
  store: PersistStore = defaultStore(),
): void {
  if (!persistQueueIsUnsaved(queue) && queue.sessionId === null) {
    store.removeItem(persistStorageKey(queue.flowId));
    return;
  }
  store.setItem(persistStorageKey(queue.flowId), JSON.stringify(queue));
}

export function clearPersistQueue(
  flowId: string,
  store: PersistStore = defaultStore(),
): void {
  store.removeItem(persistStorageKey(flowId));
}

export function rememberSessionId(
  flowId: string,
  sessionId: string,
  store: PersistStore = defaultStore(),
): PersistQueue {
  const queue = {
    ...loadPersistQueue(flowId, store),
    sessionId,
    sessionFailed: false,
  };
  savePersistQueue(queue, store);
  return queue;
}

export function markSessionFailed(
  flowId: string,
  store: PersistStore = defaultStore(),
): PersistQueue {
  const queue = {
    ...loadPersistQueue(flowId, store),
    sessionFailed: true,
  };
  savePersistQueue(queue, store);
  return queue;
}

export function enqueueInteraction(
  flowId: string,
  interaction: QueuedInteraction,
  store: PersistStore = defaultStore(),
): PersistQueue {
  const current = loadPersistQueue(flowId, store);
  const queue = {
    ...current,
    interactions: [...current.interactions, interaction],
  };
  savePersistQueue(queue, store);
  return queue;
}

export function replaceQueuedInteractions(
  flowId: string,
  interactions: QueuedInteraction[],
  store: PersistStore = defaultStore(),
): PersistQueue {
  const queue = {
    ...loadPersistQueue(flowId, store),
    interactions,
  };
  savePersistQueue(queue, store);
  return queue;
}

export function markNeedsScore(
  flowId: string,
  needsScore: boolean,
  store: PersistStore = defaultStore(),
): PersistQueue {
  const queue = {
    ...loadPersistQueue(flowId, store),
    needsScore,
  };
  savePersistQueue(queue, store);
  return queue;
}

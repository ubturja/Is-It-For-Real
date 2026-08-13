import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { del, get, set } from "idb-keyval";

/**
 * Crisis session is local-only. Never sync to Supabase or any network API.
 * IndexedDB (via idb-keyval) — not localStorage — so state survives refresh offline.
 */
const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (typeof indexedDB === "undefined") {
      return null;
    }
    return (await get<string>(name)) ?? null;
  },
  setItem: async (name, value) => {
    if (typeof indexedDB === "undefined") {
      return;
    }
    await set(name, value);
  },
  removeItem: async (name) => {
    if (typeof indexedDB === "undefined") {
      return;
    }
    await del(name);
  },
};

export type CrisisSessionState = {
  stepId: string | null;
  answers: Record<string, string>;
  startedAt: string | null;
  /** Persist progress after each machine transition. */
  syncProgress: (partial: {
    stepId: string;
    startedAt?: string;
  }) => void;
  setAnswer: (stepId: string, value: string) => void;
  /** Clear persisted session so /help starts from the first step. */
  startOver: () => void;
};

const emptySession = {
  stepId: null as string | null,
  answers: {} as Record<string, string>,
  startedAt: null as string | null,
};

export const useCrisisSession = create<CrisisSessionState>()(
  persist(
    (set, get) => ({
      ...emptySession,
      syncProgress: ({ stepId, startedAt }) => {
        set({
          stepId,
          startedAt: startedAt ?? get().startedAt ?? new Date().toISOString(),
        });
      },
      setAnswer: (stepId, value) => {
        set({
          answers: { ...get().answers, [stepId]: value },
        });
      },
      startOver: () => {
        set({ ...emptySession, answers: {} });
      },
    }),
    {
      name: "isitfr-crisis-session",
      storage: createJSONStorage(() => idbStorage),
      // Next.js: avoid touching IndexedDB during SSR; rehydrate on the client.
      skipHydration: true,
      partialize: (state) => ({
        stepId: state.stepId,
        answers: state.answers,
        startedAt: state.startedAt,
      }),
    },
  ),
);

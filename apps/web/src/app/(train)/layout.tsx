import type { ReactNode } from "react";

import { finalizeAbandonedSessions } from "@/lib/sessions/completeAndScore";

/**
 * Training-only: finish in_progress sessions that already have a completed
 * MEASURE path (tab closed before POST /score). Crisis /help is outside this
 * route group and never writes sessions.
 */
export default async function TrainLayout({
  children,
}: {
  children: ReactNode;
}) {
  await finalizeAbandonedSessions();
  return children;
}

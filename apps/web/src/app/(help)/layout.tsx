import type { ReactNode } from "react";

/**
 * Crisis Mode chrome: the five-step flow only — no Train/Profile links.
 * Auth for /help is unrelated (middleware matcher never includes this path).
 */
export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}

"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChatBubbleThemeProps = {
  children: ReactNode;
};

/**
 * Presentation-only skin around StepRenderer. Does not branch on step kinds
 * and does not reimplement step UI — descendant cards become incoming bubbles.
 */
export function ChatBubbleTheme({ children }: ChatBubbleThemeProps) {
  return (
    <div
      data-chat-bubble-theme=""
      className={cn(
        "bg-muted/50 mx-auto max-w-lg rounded-3xl border p-3 sm:p-4",
        "[&_[data-slot=card]]:rounded-2xl [&_[data-slot=card]]:rounded-bl-md",
        "[&_[data-slot=card]]:bg-background [&_[data-slot=card]]:shadow-none",
        "[&_[data-slot=card-footer]]:bg-transparent [&_[data-slot=card-footer]]:border-foreground/5",
      )}
    >
      {children}
    </div>
  );
}

"use client";

import { getFeed, getStepChrome } from "@isitfr/content-config";
import { narrowFeed } from "@isitfr/engine";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  parseEchoFeedPayload,
  perspectiveDiversity,
} from "./echoFeed";
import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

/**
 * Internal MEASURE rendering variant. Posts come from getFeed(payload.feedKey);
 * narrowing is packages/engine narrowFeed. Do not special-case persistence —
 * onAdvance(number) is the same MEASURE contract useExperimentSession already
 * records.
 */
export function EchoChamberStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const payload = parseEchoFeedPayload(step.payload);
  const catalog = getFeed(payload.feedKey);
  const [clickHistory, setClickHistory] = useState<string[]>([]);

  const visible = useMemo(
    () => narrowFeed(catalog.items, clickHistory),
    [catalog.items, clickHistory],
  );
  const opened = useMemo(() => new Set(clickHistory), [clickHistory]);
  const canFinish = clickHistory.length >= payload.clicks;

  function handleOpen(itemId: string) {
    if (opened.has(itemId)) {
      return;
    }
    setClickHistory((history) => [...history, itemId]);
  }

  function handleContinue() {
    if (!canFinish) {
      return;
    }
    const clickedItems = clickHistory.flatMap((itemId) => {
      const item = catalog.items.find((entry) => entry.id === itemId);
      return item === undefined ? [] : [item];
    });
    onAdvance(perspectiveDiversity(clickedItems, catalog.items));
  }

  return (
    <Card>
      <StepTypeHeader
        type="MEASURE"
        title={chrome.stepTypes.MEASURE.title}
        description={step.prompt}
      />
      <CardContent className="grid gap-3">
        {visible.map((post) => {
          const alreadyOpened = opened.has(post.id);
          return (
            <button
              key={post.id}
              type="button"
              disabled={alreadyOpened}
              aria-pressed={alreadyOpened}
              onClick={() => handleOpen(post.id)}
              className={cn(
                "rounded-xl border bg-background p-4 text-left transition-colors",
                alreadyOpened
                  ? "border-border opacity-60"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {post.source}
              </p>
              <p className="font-heading mt-1 text-sm font-medium leading-snug">
                {post.headline}
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {post.body}
              </p>
            </button>
          );
        })}
      </CardContent>
      <CardFooter>
        <Button type="button" disabled={!canFinish} onClick={handleContinue}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { getStepChrome } from "@isitfr/content-config";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { delayElapsed, parseDelayPayload } from "./memoryRecall";
import type { StepComponentProps } from "./types";

/**
 * Presentational timer wrapping STOP. durationMs lives on payload — not a
 * new step type. Continue stays disabled until the delay has actually elapsed.
 */
export function DelayInterstitial({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const payload = parseDelayPayload(step.payload);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const ready = delayElapsed(startedAt, payload.durationMs, now);

  useEffect(() => {
    if (ready) {
      return;
    }
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => {
      window.clearInterval(id);
    };
  }, [ready]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{payload.heading}</CardTitle>
        <CardDescription>{step.prompt}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button type="button" disabled={!ready} onClick={() => onAdvance()}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { getStepChrome } from "@isitfr/content-config";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { parseVideoDisplayPayload } from "./memoryRecall";
import type { StepComponentProps } from "./types";

/**
 * Internal STOP variant. Clip URL and credit come from payload — not hardcoded.
 */
export function VideoDisplayStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const payload = parseVideoDisplayPayload(step.payload);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{payload.heading}</CardTitle>
        <CardDescription>{step.prompt}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <video
          className="w-full rounded-lg bg-black"
          src={payload.src}
          controls
          playsInline
          preload="metadata"
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          {payload.credit}
        </p>
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={() => onAdvance()}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

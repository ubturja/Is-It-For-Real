"use client";

import { getStepChrome } from "@isitfr/content-config";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { DelayInterstitial } from "./DelayInterstitial";
import { isDelayKind, isVideoDisplayKind } from "./memoryRecall";
import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";
import { VideoDisplayStep } from "./VideoDisplayStep";

export function StopStep({ step, onAdvance }: StepComponentProps) {
  if (isVideoDisplayKind(step.payload)) {
    return <VideoDisplayStep step={step} onAdvance={onAdvance} />;
  }
  if (isDelayKind(step.payload)) {
    return <DelayInterstitial step={step} onAdvance={onAdvance} />;
  }

  return <DefaultStopStep step={step} onAdvance={onAdvance} />;
}

function DefaultStopStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();

  return (
    <Card>
      <StepTypeHeader
        type="STOP"
        title={chrome.stepTypes.STOP.title}
        description={step.prompt}
      />
      {step.why ? (
        <CardContent>
          <p className="text-muted-foreground text-sm">{step.why}</p>
        </CardContent>
      ) : null}
      <CardFooter>
        <Button type="button" onClick={() => onAdvance()}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { getStepChrome } from "@isitfr/content-config";

import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";

import { EchoChamberStep } from "./EchoChamberStep";
import { isEchoFeedKind } from "./echoFeed";
import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

/**
 * MEASURE shell. echo-feed payloads render EchoChamberStep (internal variant).
 * Linear Continue sends NEXT with no numeric value so the engine records
 * `step.weight`. Pass a number to onAdvance only when the step is an
 * explicit rating (or echo-feed diversity).
 */
export function MeasureStep({ step, onAdvance }: StepComponentProps) {
  if (isEchoFeedKind(step.payload)) {
    return <EchoChamberStep step={step} onAdvance={onAdvance} />;
  }

  return <LinearMeasureStep step={step} onAdvance={onAdvance} />;
}

function LinearMeasureStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();

  return (
    <Card>
      <StepTypeHeader
        type="MEASURE"
        title={chrome.stepTypes.MEASURE.title}
        description={step.prompt}
      />
      <CardFooter>
        <Button type="button" onClick={() => onAdvance()}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

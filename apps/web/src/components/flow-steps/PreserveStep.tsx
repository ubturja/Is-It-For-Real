import { getStepChrome } from "@isitfr/content-config";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

export function PreserveStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();

  return (
    <Card>
      <StepTypeHeader
        type="PRESERVE"
        title={chrome.stepTypes.PRESERVE.title}
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

import { getStepChrome } from "@isitfr/content-config";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { StepComponentProps } from "./types";

/**
 * MEASURE shell. Continue sends NEXT with no numeric value so the engine
 * records `step.weight` (BRANCH→MEASURE scoring). Pass a number to onAdvance
 * only when the step is an explicit rating.
 */
export function MeasureStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chrome.stepTypes.MEASURE.title}</CardTitle>
        <CardDescription>{step.prompt}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button type="button" onClick={() => onAdvance()}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

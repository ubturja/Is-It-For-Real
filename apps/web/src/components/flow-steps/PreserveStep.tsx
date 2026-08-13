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

import type { StepComponentProps } from "./types";

export function PreserveStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chrome.stepTypes.PRESERVE.title}</CardTitle>
        <CardDescription>{step.prompt}</CardDescription>
      </CardHeader>
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

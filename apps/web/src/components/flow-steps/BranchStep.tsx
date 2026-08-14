"use client";

import { getStepChrome } from "@isitfr/content-config";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { ArticleCompareStep } from "./ArticleCompareStep";
import { isArticleCompareKind } from "./articleCompare";
import { StepTypeHeader } from "./StepTypeHeader";
import { STEP_HEADING_ID } from "./stepTypeVisual";
import type { StepComponentProps } from "./types";

export function BranchStep({ step, onAdvance }: StepComponentProps) {
  if (isArticleCompareKind(step.payload)) {
    return <ArticleCompareStep step={step} onAdvance={onAdvance} />;
  }

  return <RadioBranchStep step={step} onAdvance={onAdvance} />;
}

function RadioBranchStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const options = step.options ?? [];
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return (
    <Card>
      <StepTypeHeader
        type="BRANCH"
        title={chrome.stepTypes.BRANCH.title}
        description={step.prompt}
      />
      <CardContent>
        <RadioGroup
          value={selected}
          onValueChange={(value) => setSelected(value)}
          aria-labelledby={STEP_HEADING_ID}
          className="gap-3"
        >
          {options.map((option) => {
            const id = `branch-${option.value}`;
            return (
              <div key={option.value} className="flex items-center gap-3">
                <RadioGroupItem value={option.value} id={id} />
                <Label htmlFor={id}>{option.label}</Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (selected) onAdvance(selected);
          }}
        >
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

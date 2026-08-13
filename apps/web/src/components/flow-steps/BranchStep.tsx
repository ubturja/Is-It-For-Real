"use client";

import { getStepChrome } from "@isitfr/content-config";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { StepComponentProps } from "./types";

export function BranchStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const options = step.options ?? [];
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chrome.stepTypes.BRANCH.title}</CardTitle>
        <CardDescription>{step.prompt}</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selected}
          onValueChange={(value) => setSelected(value)}
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

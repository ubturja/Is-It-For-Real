"use client";

import { getStepChrome } from "@isitfr/content-config";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  articleCompareChoiceValue,
  parseArticleComparePayload,
} from "./articleCompare";
import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

/**
 * Internal BRANCH rendering variant. Stimulus (headlines, bodies, actions)
 * comes entirely from step.payload — never hardcoded here.
 */
export function ArticleCompareStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const payload = parseArticleComparePayload(step.payload);
  const options = step.options ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >(undefined);

  function handleAction(actionValue: string) {
    if (!selectedVariantId) {
      return;
    }
    const choice = articleCompareChoiceValue(selectedVariantId, actionValue);
    const option = options.find((entry) => entry.value === choice);
    if (option === undefined) {
      throw new Error(
        `article-compare: no BRANCH option with value "${choice}"`,
      );
    }
    onAdvance(option.value);
  }

  return (
    <Card>
      <StepTypeHeader
        type="BRANCH"
        title={chrome.stepTypes.BRANCH.title}
        description={step.prompt}
      />
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {payload.variants.map((variant) => {
          const selected = selectedVariantId === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedVariantId(variant.id)}
              className={cn(
                "rounded-xl border bg-background p-4 text-left transition-colors",
                selected
                  ? "border-ring ring-2 ring-ring/50"
                  : "border-border hover:bg-muted/40",
              )}
            >
              {variant.source ? (
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {variant.source}
                </p>
              ) : null}
              <p className="font-heading mt-1 text-sm font-medium leading-snug">
                {variant.headline}
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {variant.body}
              </p>
            </button>
          );
        })}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {payload.actions.map((action) => (
          <Button
            key={action.value}
            type="button"
            disabled={!selectedVariantId}
            onClick={() => handleAction(action.value)}
          >
            {action.label}
          </Button>
        ))}
      </CardFooter>
    </Card>
  );
}

"use client";

import { getMessageTemplate, getStepChrome } from "@isitfr/content-config";
import { useCallback, useMemo, useState } from "react";

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

export function TemplateStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const [copied, setCopied] = useState(false);

  const template = useMemo(() => {
    if (!step.templateKey) {
      return null;
    }
    try {
      return getMessageTemplate(step.templateKey);
    } catch {
      return null;
    }
  }, [step.templateKey]);

  const onCopy = useCallback(async () => {
    if (!template?.body || typeof navigator === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(template.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [template?.body]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {template?.title ?? chrome.stepTypes.TEMPLATE.titleFallback}
        </CardTitle>
        <CardDescription>{step.prompt}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {template ? (
          <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
            {template.body}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {chrome.empty.template}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!template}
          onClick={() => {
            void onCopy();
          }}
        >
          {copied ? chrome.actions.copied : chrome.actions.copy}
        </Button>
        <Button type="button" onClick={() => onAdvance()}>
          {chrome.actions.continue}
        </Button>
      </CardFooter>
    </Card>
  );
}

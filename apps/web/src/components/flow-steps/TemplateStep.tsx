"use client";

import { getMessageTemplate, getStepChrome } from "@isitfr/content-config";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  PERSONALIZE_CLIENT_TIMEOUT_MS,
  requestPersonalizedTemplate,
} from "@/lib/crisis/requestPersonalizedTemplate";

import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

const NAME_DEBOUNCE_MS = 400;

export function TemplateStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState("");

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

  const [displayedBody, setDisplayedBody] = useState<string | null>(
    template?.body ?? null,
  );

  useEffect(() => {
    setDisplayedBody(template?.body ?? null);
  }, [template?.body]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedName(name.trim());
    }, NAME_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    if (!template) {
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      PERSONALIZE_CLIENT_TIMEOUT_MS,
    );
    const context =
      debouncedName.length > 0 ? { name: debouncedName } : {};

    void requestPersonalizedTemplate(template.key, context, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setDisplayedBody(result.body);
        }
      })
      .catch(() => {
        // Silent: keep the P3.3 static template. Never show an AI failure.
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [debouncedName, template]);

  const onCopy = useCallback(async () => {
    if (!displayedBody || typeof navigator === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(displayedBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [displayedBody]);

  return (
    <Card>
      <StepTypeHeader
        type="TEMPLATE"
        title={template?.title ?? chrome.stepTypes.TEMPLATE.titleFallback}
        description={step.prompt}
      />
      <CardContent className="space-y-3">
        {template ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="template-name">
                {chrome.stepTypes.TEMPLATE.nameLabel}
              </Label>
              <input
                id="template-name"
                type="text"
                autoComplete="name"
                maxLength={80}
                value={name}
                placeholder={chrome.stepTypes.TEMPLATE.namePlaceholder}
                onChange={(event) => setName(event.target.value)}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
              {displayedBody ?? template.body}
            </div>
          </>
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

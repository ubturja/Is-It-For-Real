"use client";

import { getMessageTemplate, getStepChrome } from "@isitfr/content-config";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { applyLocalName } from "@/lib/crisis/namePlaceholder";
import {
  PERSONALIZE_CLIENT_TIMEOUT_MS,
  requestPersonalizedTemplate,
} from "@/lib/crisis/requestPersonalizedTemplate";

import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

export function TemplateStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

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

  const [rewrittenBody, setRewrittenBody] = useState<string | null>(null);

  useEffect(() => {
    setRewrittenBody(null);
  }, [template?.body]);

  useEffect(() => {
    function syncOnline() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  const sourceBody = rewrittenBody ?? template?.body ?? "";
  const displayedBody = applyLocalName(sourceBody, name);

  const onPersonalize = useCallback(() => {
    if (!template || !navigator.onLine) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      PERSONALIZE_CLIENT_TIMEOUT_MS,
    );
    void requestPersonalizedTemplate(template.key, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setRewrittenBody(result.body);
        }
      })
      .catch(() => {
        // Silent: keep the P3.3 static template. Never show an AI failure.
      })
      .finally(() => {
        window.clearTimeout(timer);
      });
  }, [template]);

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
              {displayedBody}
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
          disabled={!template || !online}
          onClick={onPersonalize}
        >
          {chrome.stepTypes.TEMPLATE.personalize}
        </Button>
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

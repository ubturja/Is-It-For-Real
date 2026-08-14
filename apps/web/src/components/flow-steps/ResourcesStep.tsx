"use client";

import { getResources, getStepChrome } from "@isitfr/content-config";
import { useMemo } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { StepTypeHeader } from "./StepTypeHeader";
import type { StepComponentProps } from "./types";

export function ResourcesStep({ step, onAdvance }: StepComponentProps) {
  const chrome = getStepChrome();
  const resourceSet = useMemo(() => {
    if (!step.resourceSet) {
      return null;
    }
    try {
      return getResources(step.resourceSet);
    } catch {
      return null;
    }
  }, [step.resourceSet]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <StepTypeHeader
        type="RESOURCES"
        title={resourceSet?.title ?? chrome.stepTypes.RESOURCES.titleFallback}
        description={resourceSet?.description ?? step.prompt}
        layout="plain"
      >
        <p className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
          {chrome.stepTypes.RESOURCES.eyebrow}
        </p>
      </StepTypeHeader>

      {resourceSet ? (
        <ul className="flex list-none flex-col gap-3 p-0">
          {resourceSet.resources.map((resource) => (
            <li key={resource.id}>
              <Card size="sm" className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="outline-none hover:underline focus-visible:underline"
                    >
                      {resource.title}
                    </a>
                  </CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardFooter className="justify-between gap-2">
                  <span className="text-muted-foreground truncate text-xs">
                    {new URL(resource.url).hostname.replace(/^www\./, "")}
                  </span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    {chrome.actions.open}
                  </a>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          {chrome.empty.resources}
        </p>
      )}

      <div className="flex justify-center sm:justify-start">
        <Button type="button" variant="secondary" onClick={() => onAdvance()}>
          {chrome.actions.finish}
        </Button>
      </div>
    </div>
  );
}

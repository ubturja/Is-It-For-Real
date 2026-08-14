import type { ReactNode } from "react";
import type { Step } from "@isitfr/schemas";

import {
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  STEP_HEADING_ID,
  STEP_TYPE_VISUAL,
  stepTypeLabel,
} from "./stepTypeVisual";

type StepTypeHeaderProps = {
  type: Step["type"];
  title: string;
  description?: string;
  /** Crisis RESOURCES uses a page header instead of a card header. */
  layout?: "card" | "plain";
  children?: ReactNode;
};

function StepHeading({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h1
      id={STEP_HEADING_ID}
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
    >
      {children}
    </h1>
  );
}

function TypeCue({
  type,
  title,
  headingClassName,
}: {
  type: Step["type"];
  title: string;
  headingClassName?: string;
}) {
  const visual = STEP_TYPE_VISUAL[type];
  const Icon = visual.icon;
  const typeLabel = stepTypeLabel(type);
  const titleIsTypeLabel = title === typeLabel;

  return (
    <div className={cn("flex items-center gap-2", visual.textClass)}>
      <Icon
        aria-hidden="true"
        data-step-type-icon=""
        className="size-5 shrink-0"
      />
      {titleIsTypeLabel ? (
        <StepHeading className={headingClassName}>{title}</StepHeading>
      ) : (
        <span className="text-xs font-semibold tracking-wide uppercase">
          {typeLabel}
        </span>
      )}
    </div>
  );
}

/**
 * Step-type color strip: left border + icon + text label. Color is never
 * the only signifier.
 */
export function StepTypeHeader({
  type,
  title,
  description,
  layout = "card",
  children,
}: StepTypeHeaderProps) {
  const visual = STEP_TYPE_VISUAL[type];
  const typeLabel = stepTypeLabel(type);
  const titleIsTypeLabel = title === typeLabel;
  const headingClassName =
    layout === "plain" ? "text-2xl tracking-tight text-balance" : undefined;

  const cueAndTitle = (
    <>
      <TypeCue
        type={type}
        title={title}
        headingClassName={headingClassName}
      />
      {children}
      {titleIsTypeLabel ? null : (
        <StepHeading className={headingClassName}>{title}</StepHeading>
      )}
      {description ? (
        <CardDescription className={layout === "plain" ? "text-pretty" : undefined}>
          {description}
        </CardDescription>
      ) : null}
    </>
  );

  if (layout === "plain") {
    return (
      <header
        data-step-type={type}
        className={cn(
          "flex flex-col items-center space-y-2 border-l-4 pl-3 text-center sm:items-start sm:text-left",
          visual.borderClass,
        )}
      >
        {cueAndTitle}
      </header>
    );
  }

  return (
    <CardHeader
      data-step-type={type}
      className={cn("border-l-4", visual.borderClass)}
    >
      {cueAndTitle}
    </CardHeader>
  );
}

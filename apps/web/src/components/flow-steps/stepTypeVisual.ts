import { getStepChrome } from "@isitfr/content-config";
import type { Step } from "@isitfr/schemas";
import {
  Camera,
  Gauge,
  GitBranch,
  HeartHandshake,
  MessageSquare,
  OctagonX,
  type LucideIcon,
} from "lucide-react";

/**
 * Color + icon for each step type. Copy stays in step chrome; this map is
 * presentation only so color is never the only cue.
 */
export type StepTypeVisual = {
  icon: LucideIcon;
  textClass: string;
  borderClass: string;
};

export const STEP_TYPE_VISUAL: Record<Step["type"], StepTypeVisual> = {
  STOP: {
    icon: OctagonX,
    textClass: "text-step-stop",
    borderClass: "border-step-stop",
  },
  PRESERVE: {
    icon: Camera,
    textClass: "text-step-preserve",
    borderClass: "border-step-preserve",
  },
  BRANCH: {
    icon: GitBranch,
    textClass: "text-step-branch",
    borderClass: "border-step-branch",
  },
  TEMPLATE: {
    icon: MessageSquare,
    textClass: "text-step-template",
    borderClass: "border-step-template",
  },
  RESOURCES: {
    icon: HeartHandshake,
    textClass: "text-step-resources",
    borderClass: "border-step-resources",
  },
  MEASURE: {
    icon: Gauge,
    textClass: "text-step-measure",
    borderClass: "border-step-measure",
  },
};

export const STEP_HEADING_ID = "step-heading";

export function stepTypeLabel(type: Step["type"]): string {
  const chrome = getStepChrome();
  switch (type) {
    case "STOP":
      return chrome.stepTypes.STOP.title;
    case "PRESERVE":
      return chrome.stepTypes.PRESERVE.title;
    case "BRANCH":
      return chrome.stepTypes.BRANCH.title;
    case "MEASURE":
      return chrome.stepTypes.MEASURE.title;
    case "TEMPLATE":
      return chrome.stepTypes.TEMPLATE.titleFallback;
    case "RESOURCES":
      return chrome.stepTypes.RESOURCES.titleFallback;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

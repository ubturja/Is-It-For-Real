import type { Step } from "@isitfr/schemas";

import { BranchStep } from "./BranchStep";
import { MeasureStep } from "./MeasureStep";
import { PreserveStep } from "./PreserveStep";
import { ResourcesStep } from "./ResourcesStep";
import { StopStep } from "./StopStep";
import { TemplateStep } from "./TemplateStep";
import type { OnAdvance } from "./types";

export type StepRendererProps = {
  step: Step;
  onAdvance: OnAdvance;
};

/**
 * Sole app-level switch on step.type. Step components themselves never branch on type.
 */
export function StepRenderer({ step, onAdvance }: StepRendererProps) {
  switch (step.type) {
    case "STOP":
      return <StopStep step={step} onAdvance={onAdvance} />;
    case "PRESERVE":
      return <PreserveStep step={step} onAdvance={onAdvance} />;
    case "BRANCH":
      return <BranchStep step={step} onAdvance={onAdvance} />;
    case "TEMPLATE":
      return <TemplateStep step={step} onAdvance={onAdvance} />;
    case "RESOURCES":
      return <ResourcesStep step={step} onAdvance={onAdvance} />;
    case "MEASURE":
      return <MeasureStep step={step} onAdvance={onAdvance} />;
    default: {
      const _exhaustive: never = step.type;
      return _exhaustive;
    }
  }
}

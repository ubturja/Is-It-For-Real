import type { Step } from "@isitfr/schemas";

/** string = BRANCH option; number = MEASURE value on NEXT; omit = linear NEXT */
export type OnAdvance = (value?: string | number) => void;

export type StepComponentProps = {
  step: Step;
  onAdvance: OnAdvance;
};

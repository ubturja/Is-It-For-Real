import { validateStepChrome, type StepChrome } from "@isitfr/schemas";

import stepChromeEn from "./chrome/stepChrome.en.json";

/** Per-step-type UI chrome (not per-flow). Validated at module init. */
export const stepChrome: StepChrome = validateStepChrome(stepChromeEn);

export function getStepChrome(): StepChrome {
  return stepChrome;
}

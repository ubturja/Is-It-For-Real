import { validateLandingChrome, type LandingChrome } from "@isitfr/schemas";

import landingChromeEn from "./chrome/landingChrome.en.json";

/** Home landing chrome. Validated at module init. */
export const landingChrome: LandingChrome =
  validateLandingChrome(landingChromeEn);

export function getLandingChrome(): LandingChrome {
  return landingChrome;
}

import { validateProfileChrome, type ProfileChrome } from "@isitfr/schemas";

import profileChromeEn from "./chrome/profileChrome.en.json";

/** Profile page chrome (not per-experiment). Validated at module init. */
export const profileChrome: ProfileChrome = validateProfileChrome(profileChromeEn);

export function getProfileChrome(): ProfileChrome {
  return profileChrome;
}

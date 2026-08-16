import { validateAuthChrome, type AuthChrome } from "@isitfr/schemas";

import authChromeEn from "./chrome/authChrome.en.json";

/** Login / password-reset chrome (training path only). Validated at module init. */
export const authChrome: AuthChrome = validateAuthChrome(authChromeEn);

export function getAuthChrome(): AuthChrome {
  return authChrome;
}

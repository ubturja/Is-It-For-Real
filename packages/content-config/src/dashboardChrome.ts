import {
  validateDashboardChrome,
  type DashboardChrome,
} from "@isitfr/schemas";

import dashboardChromeEn from "./chrome/dashboardChrome.en.json";

/** Train dashboard chrome (not per-experiment). Validated at module init. */
export const dashboardChrome: DashboardChrome =
  validateDashboardChrome(dashboardChromeEn);

export function getDashboardChrome(): DashboardChrome {
  return dashboardChrome;
}

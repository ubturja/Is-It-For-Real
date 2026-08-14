import { validateReportChrome, type ReportChrome } from "@isitfr/schemas";

import reportChromeEn from "./chrome/reportChrome.en.json";

/** Reflection report chrome (not per-experiment). Validated at module init. */
export const reportChrome: ReportChrome = validateReportChrome(reportChromeEn);

export function getReportChrome(): ReportChrome {
  return reportChrome;
}

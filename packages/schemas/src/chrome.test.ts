import { describe, expect, it } from "vitest";
import { validateDashboardChrome, validateReportChrome, validateStepChrome } from "./chrome";

describe("validateStepChrome", () => {
  it("rejects chrome missing STOP title", () => {
    expect(() =>
      validateStepChrome({
        locale: "en",
        stepTypes: {
          STOP: {},
          PRESERVE: { title: "Preserve evidence" },
          BRANCH: { title: "Choose a path" },
          MEASURE: { title: "Measure" },
          TEMPLATE: { titleFallback: "Message template" },
          RESOURCES: {
            eyebrow: "Done for now",
            titleFallback: "Resources",
          },
        },
        empty: {
          resources: "No resources are available for this step.",
          template: "No message template is available for this step.",
        },
        actions: {
          continue: "Continue",
          finish: "Finish",
          open: "Open",
          copy: "Copy to clipboard",
          copied: "Copied",
        },
      }),
    ).toThrow(/title/i);
  });
});

describe("validateReportChrome", () => {
  it("rejects chrome missing the regenerate label", () => {
    expect(() =>
      validateReportChrome({
        locale: "en",
        title: "A short reflection",
        intro: "A few notes from this run.",
        strengths: "What went well",
        growthAreas: "Worth trying next time",
        regenerating: "Writing…",
        regenerateWait: "Give it a moment",
        loading: "Writing a short reflection…",
        unavailable: "This reflection didn't come through.",
        back: "Back to scenarios",
      }),
    ).toThrow(/regenerate/i);
  });
});

describe("validateDashboardChrome", () => {
  it("rejects chrome missing the intro", () => {
    expect(() =>
      validateDashboardChrome({
        locale: "en",
        title: "Train",
        profile: "Your profile",
      }),
    ).toThrow(/intro/i);
  });
});

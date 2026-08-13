import { describe, expect, it } from "vitest";
import { validateStepChrome } from "./chrome";

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

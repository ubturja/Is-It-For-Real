import { describe, expect, it } from "vitest";
import {
  validateAuthChrome,
  validateDashboardChrome,
  validateLandingChrome,
  validateReportChrome,
  validateStepChrome,
} from "./chrome";

describe("validateStepChrome", () => {
  it("rejects chrome missing STOP title", () => {
    expect(() =>
      validateStepChrome({
        locale: "en",
        stepTypes: {
          STOP: {},
          PRESERVE: { title: "Preserve evidence" },
          BRANCH: { title: "Choose a path" },
          MEASURE: { title: "Your take" },
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

  it("rejects MEASURE chrome titled Measure", () => {
    expect(() =>
      validateStepChrome({
        locale: "en",
        stepTypes: {
          STOP: { title: "Stop" },
          PRESERVE: { title: "Preserve evidence" },
          BRANCH: { title: "Choose a path" },
          MEASURE: { title: "Measure" },
          TEMPLATE: {
            titleFallback: "Message template",
            nameLabel: "A name",
            namePlaceholder: "Name",
            personalize: "Reword",
          },
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
        persist: {
          unsaved: "Your progress may not have saved.",
        },
      }),
    ).toThrow(/Measure/);
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

describe("validateLandingChrome", () => {
  it("rejects chrome missing the hero headline", () => {
    expect(() =>
      validateLandingChrome({
        locale: "en",
        hero: { subline: "Two tools." },
        explainer: [
          { eyebrow: "What this is", body: "A." },
          { eyebrow: "The problem", body: "B." },
          { eyebrow: "What you do here", body: "C." },
        ],
        entries: [
          {
            kind: "practice",
            eyebrow: "Practice",
            body: "A.",
            action: "Start practicing",
          },
          {
            kind: "help",
            eyebrow: "Get help now",
            body: "B.",
            action: "Get help now",
          },
        ],
        footer: {
          wordmark: "IsItFR",
          practice: "Practice",
          help: "Get help now",
          note: "Crisis help never asks you to sign in.",
        },
      }),
    ).toThrow(/headline/i);
  });

  it("rejects chrome that does not have exactly three explainer blocks", () => {
    expect(() =>
      validateLandingChrome({
        locale: "en",
        hero: { headline: "Is It For Real?", subline: "Two tools." },
        explainer: [{ eyebrow: "What this is", body: "A." }],
        entries: [
          {
            kind: "practice",
            eyebrow: "Practice",
            body: "A.",
            action: "Start practicing",
          },
          {
            kind: "help",
            eyebrow: "Get help now",
            body: "B.",
            action: "Get help now",
          },
        ],
        footer: {
          wordmark: "IsItFR",
          practice: "Practice",
          help: "Get help now",
          note: "Crisis help never asks you to sign in.",
        },
      }),
    ).toThrow(/explainer/i);
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

describe("validateAuthChrome", () => {
  it("rejects chrome missing the forgot sent copy", () => {
    expect(() =>
      validateAuthChrome({
        locale: "en",
        signOut: "Log out",
        forgot: {
          link: "Forgot password?",
          title: "Reset password",
          description: "Enter your email.",
          submit: "Send reset link",
          back: "Back to sign in",
        },
        reset: {
          title: "Choose a new password",
          description: "Pick a new password.",
          password: "New password",
          confirm: "Confirm password",
          submit: "Update password",
          mismatch: "Passwords do not match.",
          missingSession: "This reset link is invalid or has expired.",
        },
      }),
    ).toThrow(/sent/i);
  });
});

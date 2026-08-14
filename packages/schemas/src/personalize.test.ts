import { describe, expect, it } from "vitest";

import {
  PersonalizeTemplatePromptSchema,
  validatePersonalizeTemplateRequest,
  validatePersonalizeTemplateResponse,
} from "./personalize";

describe("validatePersonalizeTemplateRequest", () => {
  it("accepts a template key with an optional name", () => {
    expect(
      validatePersonalizeTemplateRequest({
        templateKey: "crisis-deepfake-classmate-trusted-adult",
        context: { name: "Alex" },
      }),
    ).toEqual({
      templateKey: "crisis-deepfake-classmate-trusted-adult",
      context: { name: "Alex" },
    });
  });

  it("defaults context to empty", () => {
    expect(
      validatePersonalizeTemplateRequest({
        templateKey: "crisis-deepfake-classmate-trusted-adult",
      }),
    ).toEqual({
      templateKey: "crisis-deepfake-classmate-trusted-adult",
      context: {},
    });
  });

  it("rejects extra context keys so this cannot become a planner", () => {
    expect(() =>
      validatePersonalizeTemplateRequest({
        templateKey: "crisis-deepfake-classmate-trusted-adult",
        context: { name: "Alex", plan: "call the police" },
      }),
    ).toThrow(/Unrecognized key/i);
  });

  it("rejects a name that is too long", () => {
    expect(() =>
      validatePersonalizeTemplateRequest({
        templateKey: "crisis-deepfake-classmate-trusted-adult",
        context: { name: "x".repeat(81) },
      }),
    ).toThrow(/name/i);
  });
});

describe("PersonalizeTemplatePromptSchema", () => {
  it("only allows the fixed template plus optional name", () => {
    expect(
      PersonalizeTemplatePromptSchema.parse({
        template: "Hi [name], I need help.",
        context: { name: "Alex" },
      }),
    ).toEqual({
      template: "Hi [name], I need help.",
      context: { name: "Alex" },
    });

    expect(() =>
      PersonalizeTemplatePromptSchema.parse({
        template: "Hi [name], I need help.",
        context: {},
        steps: ["stop", "report"],
      }),
    ).toThrow(/Unrecognized key/i);
  });
});

describe("validatePersonalizeTemplateResponse", () => {
  it("accepts title and body only", () => {
    expect(
      validatePersonalizeTemplateResponse({
        title: "Message to a trusted adult",
        body: "Hi Alex, can we talk?",
      }),
    ).toEqual({
      title: "Message to a trusted adult",
      body: "Hi Alex, can we talk?",
    });
  });

  it("rejects a step sequence in place of message text", () => {
    expect(() =>
      validatePersonalizeTemplateResponse({
        title: "Message to a trusted adult",
        body: "Hi Alex, can we talk?",
        steps: ["STOP", "PRESERVE"],
        next: "resources",
      }),
    ).toThrow(/Unrecognized key/i);

    expect(() =>
      validatePersonalizeTemplateResponse({
        steps: ["STOP", "PRESERVE", "TEMPLATE"],
      }),
    ).toThrow();
  });
});

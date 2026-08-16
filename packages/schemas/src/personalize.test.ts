import { describe, expect, it } from "vitest";

import {
  PersonalizeTemplatePromptSchema,
  validatePersonalizeTemplateRequest,
  validatePersonalizeTemplateResponse,
} from "./personalize";

const TEMPLATE_KEY = "crisis-deepfake-classmate-trusted-adult";

describe("validatePersonalizeTemplateRequest", () => {
  it("accepts a template key only", () => {
    expect(
      validatePersonalizeTemplateRequest({
        templateKey: TEMPLATE_KEY,
      }),
    ).toEqual({
      templateKey: TEMPLATE_KEY,
    });
  });

  it("rejects a leftover name field on the wire", () => {
    expect(() =>
      validatePersonalizeTemplateRequest({
        templateKey: TEMPLATE_KEY,
        name: "Alex",
      }),
    ).toThrow(/Unrecognized key/i);

    expect(() =>
      validatePersonalizeTemplateRequest({
        templateKey: TEMPLATE_KEY,
        context: { name: "Alex" },
      }),
    ).toThrow(/Unrecognized key/i);
  });

  it("rejects extra planner keys so this cannot become a prompt bag", () => {
    expect(() =>
      validatePersonalizeTemplateRequest({
        templateKey: TEMPLATE_KEY,
        plan: "call the police",
      }),
    ).toThrow(/Unrecognized key/i);
  });
});

describe("PersonalizeTemplatePromptSchema", () => {
  it("only allows the fixed template string — no name, no planner keys", () => {
    expect(
      PersonalizeTemplatePromptSchema.parse({
        template: "Hi {{name}}, I need help.",
      }),
    ).toEqual({
      template: "Hi {{name}}, I need help.",
    });

    expect(() =>
      PersonalizeTemplatePromptSchema.parse({
        template: "Hi {{name}}, I need help.",
        context: { name: "Alex" },
      }),
    ).toThrow(/Unrecognized key/i);

    expect(() =>
      PersonalizeTemplatePromptSchema.parse({
        template: "Hi {{name}}, I need help.",
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

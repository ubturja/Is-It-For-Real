import { describe, expect, it } from "vitest";

import { getMessageTemplate } from "@isitfr/content-config";

import {
  NAME_TOKEN,
  applyLocalName,
  withNameToken,
} from "./namePlaceholder";

describe("withNameToken", () => {
  it("replaces canned name slots with {{name}} and leaves other slots", () => {
    const source = getMessageTemplate(
      "crisis-deepfake-classmate-trusted-adult",
    );
    const tokenized = withNameToken(source.body);
    expect(tokenized).toContain(NAME_TOKEN);
    expect(tokenized).not.toMatch(/\[trusted adult's name\]/);
    expect(tokenized).not.toMatch(/\[classmate's name\]/);
    expect(tokenized).not.toMatch(/\[your name\]/);
    expect(source.body).toMatch(/\[trusted adult's name\]/);
  });
});

describe("applyLocalName", () => {
  it("substitutes the typed name locally after the model returns {{name}}", () => {
    expect(applyLocalName(`Hi ${NAME_TOKEN}, can we talk?`, "Alex")).toBe(
      "Hi Alex, can we talk?",
    );
  });

  it("fills canned brackets without sending them to a model", () => {
    const source = getMessageTemplate(
      "crisis-deepfake-classmate-trusted-adult",
    );
    const filled = applyLocalName(source.body, "Alex");
    expect(filled).toContain("Alex");
    expect(filled).not.toMatch(/\[trusted adult's name\]/);
    expect(filled).not.toContain(NAME_TOKEN);
  });
});

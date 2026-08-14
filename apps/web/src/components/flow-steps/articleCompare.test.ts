import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  articleCompareChoiceValue,
  isArticleCompareKind,
  parseArticleComparePayload,
} from "./articleCompare";

const validPayload = {
  kind: "article-compare" as const,
  variants: [
    {
      id: "neutral",
      headline: "Council shortens hours",
      body: "A 6–3 vote.",
      source: "Civic Record",
    },
  ],
  actions: [{ value: "trust", label: "I trust this one" }],
};

describe("isArticleCompareKind", () => {
  it("is true only when payload.kind is article-compare", () => {
    expect(isArticleCompareKind(validPayload)).toBe(true);
    expect(isArticleCompareKind({ kind: "other" })).toBe(false);
    expect(isArticleCompareKind(undefined)).toBe(false);
    expect(isArticleCompareKind(null)).toBe(false);
  });
});

describe("parseArticleComparePayload", () => {
  it("accepts variants and actions from payload", () => {
    expect(parseArticleComparePayload(validPayload)).toEqual(validPayload);
  });

  it("rejects article-compare payloads missing variants", () => {
    expect(() =>
      parseArticleComparePayload({ kind: "article-compare", actions: [] }),
    ).toThrow(/Invalid article-compare payload/);
  });
});

describe("articleCompareChoiceValue", () => {
  it("joins variant id and action for the BRANCH option value", () => {
    expect(articleCompareChoiceValue("emotional", "share")).toBe(
      "emotional_share",
    );
  });
});

describe("BRANCH-internal wiring", () => {
  it("is used by BranchStep and is not a StepRenderer case", () => {
    const branch = readFileSync(resolve(__dirname, "BranchStep.tsx"), "utf8");
    const renderer = readFileSync(
      resolve(__dirname, "StepRenderer.tsx"),
      "utf8",
    );

    expect(branch).toMatch(/ArticleCompareStep/);
    expect(branch).toMatch(/isArticleCompareKind/);
    expect(renderer).not.toMatch(/article-compare|ArticleCompareStep/);
  });
});

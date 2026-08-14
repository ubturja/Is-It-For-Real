import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  isEchoFeedKind,
  parseEchoFeedPayload,
  perspectiveDiversity,
} from "./echoFeed";

const validPayload = {
  kind: "echo-feed" as const,
  feedKey: "echo-chamber",
  clicks: 5,
};

describe("isEchoFeedKind", () => {
  it("is true only when payload.kind is echo-feed", () => {
    expect(isEchoFeedKind(validPayload)).toBe(true);
    expect(isEchoFeedKind({ kind: "article-compare" })).toBe(false);
    expect(isEchoFeedKind(undefined)).toBe(false);
  });
});

describe("parseEchoFeedPayload", () => {
  it("accepts feedKey and clicks from payload", () => {
    expect(parseEchoFeedPayload(validPayload)).toEqual(validPayload);
  });

  it("rejects echo-feed payloads missing clicks", () => {
    expect(() =>
      parseEchoFeedPayload({ kind: "echo-feed", feedKey: "echo-chamber" }),
    ).toThrow(/Invalid echo-feed payload/);
  });
});

describe("perspectiveDiversity", () => {
  const catalog = [
    { topics: ["climate"] },
    { topics: ["sports"] },
    { topics: ["tech"] },
    { topics: ["culture"] },
  ];

  it("is unique topics clicked divided by topics in the catalog", () => {
    expect(perspectiveDiversity([{ topics: ["sports"] }], catalog)).toBe(0.25);
    expect(
      perspectiveDiversity(
        [{ topics: ["sports"] }, { topics: ["climate"] }],
        catalog,
      ),
    ).toBe(0.5);
  });

  it("is 0 when nothing has been clicked", () => {
    expect(perspectiveDiversity([], catalog)).toBe(0);
  });
});

describe("MEASURE-internal wiring", () => {
  it("is used by MeasureStep and is not a StepRenderer case", () => {
    const measure = readFileSync(resolve(__dirname, "MeasureStep.tsx"), "utf8");
    const renderer = readFileSync(
      resolve(__dirname, "StepRenderer.tsx"),
      "utf8",
    );
    const session = readFileSync(
      resolve(__dirname, "../../hooks/useExperimentSession.ts"),
      "utf8",
    );

    expect(measure).toMatch(/EchoChamberStep/);
    expect(measure).toMatch(/isEchoFeedKind/);
    expect(renderer).not.toMatch(/echo-feed|EchoChamberStep/);
    expect(session).not.toMatch(/echo-chamber|EchoChamberStep|echo-feed/);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  delayElapsed,
  isDelayKind,
  isVideoDisplayKind,
  parseDelayPayload,
  parseVideoDisplayPayload,
} from "./memoryRecall";

const videoPayload = {
  kind: "video-display" as const,
  heading: "A short clip",
  src: "https://example.com/clip.mp4",
  credit: "CC0 placeholder",
};

const delayPayload = {
  kind: "delay" as const,
  heading: "A short pause",
  durationMs: 8000,
};

describe("video-display / delay payload", () => {
  it("detects kinds without treating other payloads as video or delay", () => {
    expect(isVideoDisplayKind(videoPayload)).toBe(true);
    expect(isDelayKind(delayPayload)).toBe(true);
    expect(isVideoDisplayKind(delayPayload)).toBe(false);
    expect(isDelayKind(videoPayload)).toBe(false);
    expect(isVideoDisplayKind(undefined)).toBe(false);
  });

  it("parses video-display and delay payloads", () => {
    expect(parseVideoDisplayPayload(videoPayload)).toEqual(videoPayload);
    expect(parseDelayPayload(delayPayload)).toEqual(delayPayload);
  });

  it("rejects a delay with no durationMs", () => {
    expect(() =>
      parseDelayPayload({ kind: "delay", heading: "Wait" }),
    ).toThrow(/Invalid delay payload/);
  });
});

describe("delayElapsed", () => {
  it("is false before durationMs and true once it has passed", () => {
    expect(delayElapsed(1_000, 8_000, 1_500)).toBe(false);
    expect(delayElapsed(1_000, 8_000, 9_000)).toBe(true);
  });
});

describe("STOP-internal wiring", () => {
  it("is used by StopStep and is not a StepRenderer case", () => {
    const stop = readFileSync(resolve(__dirname, "StopStep.tsx"), "utf8");
    const renderer = readFileSync(
      resolve(__dirname, "StepRenderer.tsx"),
      "utf8",
    );

    expect(stop).toMatch(/VideoDisplayStep/);
    expect(stop).toMatch(/DelayInterstitial/);
    expect(renderer).not.toMatch(
      /video-display|DelayInterstitial|VideoDisplayStep/,
    );
  });
});

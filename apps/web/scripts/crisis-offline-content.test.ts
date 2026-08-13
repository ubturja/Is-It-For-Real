import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCrisisOfflineContent,
  collectPrecacheUrls,
  CRISIS_CONTENT,
  CRISIS_CONTENT_NEEDLE,
  precacheContentHaystack,
} from "./crisis-offline-content.mjs";

const CONTENT_URLS = CRISIS_CONTENT.map((e) => e.url);

function fakeSw(urls: string[]): string {
  const entries = urls
    .map((url) => `{'revision':'abc','url':'${url}'}`)
    .join(",");
  return `precacheEntries:[${entries}]`;
}

describe("collectPrecacheUrls", () => {
  it("parses Serwist single-quoted url fields", () => {
    const sw = fakeSw(["/help", "/manifest.json", CONTENT_URLS[0]]);
    expect(collectPrecacheUrls(sw)).toEqual(
      new Set(["/help", "/manifest.json", CONTENT_URLS[0]]),
    );
  });
});

describe("assertCrisisOfflineContent", () => {
  it("fails when the precache only lists /manifest.json", () => {
    expect(() =>
      assertCrisisOfflineContent({
        swSource: fakeSw(["/help", "/manifest.json"]),
        bundleHaystack: CRISIS_CONTENT_NEEDLE,
        precacheHaystack: "",
      }),
    ).toThrow(/missing explicit crisis content URLs/);
  });

  it("fails when the unique flow string is in neither the bundle nor the precache", () => {
    expect(() =>
      assertCrisisOfflineContent({
        swSource: fakeSw(["/help", "/manifest.json", ...CONTENT_URLS]),
        bundleHaystack: "unrelated webpack chunk",
        precacheHaystack: fakeSw(["/help", "/manifest.json", ...CONTENT_URLS]),
      }),
    ).toThrow(/absent from both the built bundle and the precache/);
  });

  it("passes when content URLs are listed and the needle is only in the bundle", () => {
    expect(() =>
      assertCrisisOfflineContent({
        swSource: fakeSw(["/help", "/manifest.json", ...CONTENT_URLS]),
        bundleHaystack: `chunk;${CRISIS_CONTENT_NEEDLE}`,
        precacheHaystack: fakeSw(["/help", "/manifest.json", ...CONTENT_URLS]),
      }),
    ).not.toThrow();
  });

  it("passes when content URLs are listed and the needle is only in precached JSON", () => {
    expect(() =>
      assertCrisisOfflineContent({
        swSource: fakeSw(["/help", "/manifest.json", ...CONTENT_URLS]),
        bundleHaystack: "code-split chunk without flow copy",
        precacheHaystack: `{"prompt":"${CRISIS_CONTENT_NEEDLE}"}`,
      }),
    ).not.toThrow();
  });
});

describe("precacheContentHaystack", () => {
  it("does not count JSON that is not listed in the manifest", () => {
    const dir = join(tmpdir(), `crisis-precache-${Date.now()}`);
    const rel = CRISIS_CONTENT[0].url.replace(/^\//, "");
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), CRISIS_CONTENT_NEEDLE, "utf8");

    const haystack = precacheContentHaystack(
      fakeSw(["/manifest.json"]),
      dir,
    );
    expect(haystack.includes(CRISIS_CONTENT_NEEDLE)).toBe(false);
  });

  it("includes JSON contents for URLs listed in the manifest", () => {
    const dir = join(tmpdir(), `crisis-precache-hit-${Date.now()}`);
    const rel = CRISIS_CONTENT[0].url.replace(/^\//, "");
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), CRISIS_CONTENT_NEEDLE, "utf8");

    const haystack = precacheContentHaystack(
      fakeSw([CRISIS_CONTENT[0].url]),
      dir,
    );
    expect(haystack.includes(CRISIS_CONTENT_NEEDLE)).toBe(true);
  });
});

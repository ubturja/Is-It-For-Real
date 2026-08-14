import { describe, expect, it } from "vitest";

import { buildFeedRegistry } from "./loadFeeds";

const valid = {
  key: "audit-feed",
  items: [
    {
      id: "post-1",
      topics: ["news"],
      headline: "Headline",
      source: "Desk",
      body: "Body",
    },
  ],
};

describe("buildFeedRegistry", () => {
  it("throws when no modules are discovered", () => {
    expect(() => buildFeedRegistry({})).toThrow(
      /No feed JSON files discovered/,
    );
  });

  it("throws (does not skip) when a discovered file fails validation", () => {
    expect(() =>
      buildFeedRegistry({
        "./feeds/broken.json": { key: "broken" },
      }),
    ).toThrow(/Invalid feed catalog in \.\/feeds\/broken\.json/);
  });

  it("throws on duplicate key across two files", () => {
    expect(() =>
      buildFeedRegistry({
        "./feeds/a.json": valid,
        "./feeds/b.json": valid,
      }),
    ).toThrow(/Duplicate feed "audit-feed"/);
  });

  it("keys the map by JSON key, not the filename", () => {
    const registry = buildFeedRegistry({
      "./feeds/any-name.json": valid,
    });
    expect(registry["audit-feed"]?.items[0]?.id).toBe("post-1");
  });
});

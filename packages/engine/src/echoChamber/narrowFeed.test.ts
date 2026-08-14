import { describe, expect, it } from "vitest";

import {
  NARROW_AFTER_TOPIC_CLICKS,
  narrowFeed,
  type FeedItem,
} from "./narrowFeed";

function item(id: string, topic: string): FeedItem {
  return { id, topics: [topic] };
}

const catalog: FeedItem[] = [
  item("climate-a", "climate"),
  item("climate-b", "climate"),
  item("climate-c", "climate"),
  item("climate-d", "climate"),
  item("sports-a", "sports"),
  item("sports-b", "sports"),
  item("sports-c", "sports"),
  item("sports-d", "sports"),
  item("tech-a", "tech"),
  item("tech-b", "tech"),
  item("tech-c", "tech"),
  item("tech-d", "tech"),
];

describe("narrowFeed", () => {
  it("returns the full catalog in original order when click history is empty", () => {
    const result = narrowFeed(catalog, []);
    expect(result).toEqual(catalog);
    expect(result).not.toBe(catalog);
  });

  it("clicking the same topic 3 times measurably narrows the returned set", () => {
    expect(NARROW_AFTER_TOPIC_CLICKS).toBe(3);

    const narrowed = narrowFeed(catalog, [
      "sports-a",
      "sports-b",
      "sports-c",
    ]);

    expect(narrowed.length).toBeLessThan(catalog.length);
    expect(narrowed.length).toBe(4);
    expect(narrowed.every((entry) => entry.topics.includes("sports"))).toBe(
      true,
    );
    expect(narrowed.map((entry) => entry.id)).toEqual([
      "sports-a",
      "sports-b",
      "sports-c",
      "sports-d",
    ]);
  });

  it("clicking varied topics keeps the feed broad", () => {
    const broad = narrowFeed(catalog, ["climate-a", "sports-a", "tech-a"]);

    expect(broad).toHaveLength(catalog.length);
    const topics = new Set(broad.flatMap((entry) => entry.topics));
    expect(topics).toEqual(new Set(["climate", "sports", "tech"]));
  });

  it("is deterministic: same clicks always yield the same ordered ids", () => {
    const clicks = ["tech-c", "tech-a", "tech-b"];
    expect(narrowFeed(catalog, clicks).map((entry) => entry.id)).toEqual(
      narrowFeed(catalog, clicks).map((entry) => entry.id),
    );
  });
});

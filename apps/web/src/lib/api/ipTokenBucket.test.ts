import { describe, expect, it } from "vitest";

import { clientIpFromHeaders, takeToken } from "./ipTokenBucket";

describe("takeToken", () => {
  const config = { capacity: 2, windowMs: 1_000 };

  it("allows up to capacity then denies until refill", () => {
    const buckets = new Map();
    expect(takeToken(buckets, "10.0.0.1", 0, config)).toBe(true);
    expect(takeToken(buckets, "10.0.0.1", 0, config)).toBe(true);
    expect(takeToken(buckets, "10.0.0.1", 0, config)).toBe(false);
    expect(takeToken(buckets, "10.0.0.2", 0, config)).toBe(true);
  });

  it("refills after the window", () => {
    const buckets = new Map();
    expect(takeToken(buckets, "10.0.0.1", 0, config)).toBe(true);
    expect(takeToken(buckets, "10.0.0.1", 0, config)).toBe(true);
    expect(takeToken(buckets, "10.0.0.1", 0, config)).toBe(false);
    expect(takeToken(buckets, "10.0.0.1", 1_000, config)).toBe(true);
  });
});

describe("clientIpFromHeaders", () => {
  it("uses the first x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("falls back to unknown when no IP headers are present", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});

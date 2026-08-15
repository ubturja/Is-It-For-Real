import { describe, expect, it } from "vitest";

import {
  GROQ_FREE_TIER_RPD,
  GROQ_FREE_TIER_RPM,
} from "@/lib/ai/groqLimits";

import {
  PERSONALIZE_DAILY_CAPACITY,
  PERSONALIZE_RATE_CAPACITY,
  allowPersonalizeRequest,
  resetPersonalizeRateLimit,
} from "./personalizeRateLimit";

function requestFromIp(ip: string): Request {
  return new Request("http://localhost/api/crisis/personalize-template", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("personalizeRateLimit vs Groq free tier", () => {
  it("keeps per-minute and daily caps strictly below Groq's published ceilings", () => {
    expect(PERSONALIZE_RATE_CAPACITY).toBeLessThan(GROQ_FREE_TIER_RPM);
    expect(PERSONALIZE_DAILY_CAPACITY).toBeLessThan(GROQ_FREE_TIER_RPD);
    expect(GROQ_FREE_TIER_RPM).toBe(30);
    expect(GROQ_FREE_TIER_RPD).toBe(1_000);
  });

  it("blocks further taps after the rolling daily budget, even from a new IP", () => {
    resetPersonalizeRateLimit();
    const now = 1_700_000_000_000;
    for (let i = 0; i < PERSONALIZE_DAILY_CAPACITY; i += 1) {
      const octet = (i % 250) + 1;
      expect(
        allowPersonalizeRequest(requestFromIp(`203.0.113.${octet}`), now),
      ).toBe(true);
    }
    expect(allowPersonalizeRequest(requestFromIp("198.51.100.9"), now)).toBe(
      false,
    );
  });
});

import { describe, expect, it } from "vitest";
import { buildRateLimitHeaders, normalizeRateLimitRow } from "./rate-limit";

describe("rate limit helpers", () => {
  it("normalizes RPC rows into response metadata", () => {
    const decision = normalizeRateLimitRow(
      {
        allowed: false,
        limit_count: 20,
        remaining_count: 0,
        reset_at: "2026-04-29T12:01:00.000Z",
      },
      new Date("2026-04-29T12:00:10.000Z"),
    );

    expect(decision).toEqual({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetAt: "2026-04-29T12:01:00.000Z",
      retryAfter: 50,
    });
  });

  it("includes Retry-After only for blocked requests", () => {
    expect(
      buildRateLimitHeaders({
        allowed: false,
        limit: 20,
        remaining: 0,
        resetAt: "2026-04-29T12:01:00.000Z",
        retryAfter: 50,
      }),
    ).toMatchObject({
      "Retry-After": "50",
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": "0",
    });

    expect(
      buildRateLimitHeaders({
        allowed: true,
        limit: 20,
        remaining: 19,
        resetAt: "2026-04-29T12:01:00.000Z",
        retryAfter: 50,
      }),
    ).not.toHaveProperty("Retry-After");
  });
});

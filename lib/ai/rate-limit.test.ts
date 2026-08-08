import { describe, expect, it } from "vitest";
import {
  AI_RATE_LIMITS,
  checkAIRateLimit,
  recordAIRequest,
  resetAIRateLimitForTests,
} from "@/lib/ai/rate-limit";

describe("AI rate limit", () => {
  it("enforces minimum interval between requests", () => {
    resetAIRateLimitForTests();
    const userId = "user-interval";

    expect(checkAIRateLimit(userId, 1_000).allowed).toBe(true);
    recordAIRequest(userId, 1_000);

    const blocked = checkAIRateLimit(userId, 10_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.reason).toBe("interval");
    }
  });

  it("enforces hourly request cap", () => {
    resetAIRateLimitForTests();
    const userId = "user-hourly";
    const start = 1_000_000;

    for (let index = 0; index < AI_RATE_LIMITS.maxRequestsPerHour; index += 1) {
      recordAIRequest(userId, start + index * AI_RATE_LIMITS.minIntervalMs);
    }

    const blocked = checkAIRateLimit(
      userId,
      start + AI_RATE_LIMITS.maxRequestsPerHour * AI_RATE_LIMITS.minIntervalMs,
    );
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.reason).toBe("hourly");
    }
  });
});

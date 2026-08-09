import { describe, expect, it } from "vitest";
import {
  APP_RUNTIME_RATE_LIMITS,
  checkAppRuntimeWriteRateLimit,
  recordAppRuntimeWrite,
  resetAppRuntimeRateLimitForTests,
} from "@/lib/app-runtime/rate-limit";

describe("app-runtime write rate limit", () => {
  it("allows writes under the per-minute cap", () => {
    resetAppRuntimeRateLimitForTests();
    const portfolioId = "portfolio-1";

    for (let index = 0; index < APP_RUNTIME_RATE_LIMITS.maxWritesPerMinute; index += 1) {
      expect(checkAppRuntimeWriteRateLimit(portfolioId, index).allowed).toBe(true);
      recordAppRuntimeWrite(portfolioId, index);
    }

    const blocked = checkAppRuntimeWriteRateLimit(
      portfolioId,
      APP_RUNTIME_RATE_LIMITS.maxWritesPerMinute,
    );
    expect(blocked.allowed).toBe(false);
    resetAppRuntimeRateLimitForTests();
  });
});

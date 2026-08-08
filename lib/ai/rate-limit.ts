/**
 * In-memory per-user rate limiting for AI generation.
 *
 * Best-effort on multi-instance deployments; sufficient for v2 cost guard.
 */

const MAX_REQUESTS_PER_HOUR = 10;
const MIN_INTERVAL_MS = 30_000;
const WINDOW_MS = 60 * 60 * 1000;

type UserRecord = {
  timestamps: number[];
  lastRequestAt: number;
};

const records = new Map<string, UserRecord>();

function pruneOldTimestamps(timestamps: number[], now: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number; reason: "interval" | "hourly" };

export function checkAIRateLimit(userId: string, now = Date.now()): RateLimitResult {
  const record = records.get(userId) ?? { timestamps: [], lastRequestAt: 0 };

  if (record.lastRequestAt > 0 && now - record.lastRequestAt < MIN_INTERVAL_MS) {
    return {
      allowed: false,
      retryAfterMs: MIN_INTERVAL_MS - (now - record.lastRequestAt),
      reason: "interval",
    };
  }

  const recent = pruneOldTimestamps(record.timestamps, now);
  if (recent.length >= MAX_REQUESTS_PER_HOUR) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterMs: WINDOW_MS - (now - oldest),
      reason: "hourly",
    };
  }

  return { allowed: true };
}

export function recordAIRequest(userId: string, now = Date.now()): void {
  const record = records.get(userId) ?? { timestamps: [], lastRequestAt: 0 };
  const recent = pruneOldTimestamps(record.timestamps, now);
  records.set(userId, {
    timestamps: [...recent, now],
    lastRequestAt: now,
  });
}

export const AI_RATE_LIMITS = {
  maxPromptLength: 2000,
  maxRequestsPerHour: MAX_REQUESTS_PER_HOUR,
  minIntervalMs: MIN_INTERVAL_MS,
} as const;

/** Resets rate-limit state — for tests only. */
export function resetAIRateLimitForTests(): void {
  records.clear();
}

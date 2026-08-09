/**
 * Per-project rate limiting for app-runtime public writes (Plan 31).
 *
 * Best-effort in-memory store; sufficient for v1 multi-tenant guard.
 */

const MAX_WRITES_PER_MINUTE = 30;
const WINDOW_MS = 60_000;

type ProjectRecord = {
  timestamps: number[];
};

const records = new Map<string, ProjectRecord>();

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
}

export type AppRuntimeRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export function checkAppRuntimeWriteRateLimit(
  portfolioId: string,
  now = Date.now(),
): AppRuntimeRateLimitResult {
  const record = records.get(portfolioId) ?? { timestamps: [] };
  const recent = prune(record.timestamps, now);

  if (recent.length >= MAX_WRITES_PER_MINUTE) {
    const oldest = recent[0] ?? now;
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  return { allowed: true };
}

export function recordAppRuntimeWrite(portfolioId: string, now = Date.now()): void {
  const record = records.get(portfolioId) ?? { timestamps: [] };
  const recent = prune(record.timestamps, now);
  records.set(portfolioId, { timestamps: [...recent, now] });
}

/** Resets rate-limit state — for tests only. */
export function resetAppRuntimeRateLimitForTests(): void {
  records.clear();
}

export const APP_RUNTIME_RATE_LIMITS = {
  maxWritesPerMinute: MAX_WRITES_PER_MINUTE,
  windowMs: WINDOW_MS,
} as const;

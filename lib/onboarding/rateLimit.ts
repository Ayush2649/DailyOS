/**
 * In-memory sliding-window rate limiter for onboarding routes.
 * Source: docs/features/onboarding.md (v2.3, §11)
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  rateLimitStore.forEach((record, key) => {
    record.timestamps = record.timestamps.filter((ts: number) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  });
}

/**
 * Checks whether a request exceeds the limit within windowMs.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number = 60 * 1000
): { allowed: boolean; retryAfterSeconds: number } {
  cleanupStaleRecords(windowMs);

  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  record.timestamps.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Resets rate limit for an identifier (useful in tests)
 */
export function resetRateLimit(identifier?: string) {
  if (identifier) {
    rateLimitStore.delete(identifier);
  } else {
    rateLimitStore.clear();
  }
}

/**
 * In-memory token bucket rate limiter.
 *
 * Each key (typically an IP) gets a bucket that refills at a fixed rate.
 * When the bucket is empty, requests are rejected with 429.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  /** Max tokens in the bucket */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
}

const buckets = new Map<string, Bucket>();

// Periodically clean up stale buckets (every 5 min)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const STALE_THRESHOLD = 10 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > STALE_THRESHOLD) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Allow Node to exit even if timer is running
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function refill(bucket: Bucket, config: RateLimitConfig): void {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; retryAfter: number } {
  startCleanup();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: Date.now() };
    buckets.set(key, bucket);
  }

  refill(bucket, config);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
  }

  const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
  return { allowed: false, remaining: 0, retryAfter };
}

/** Preset configs */
export const RATE_LIMITS = {
  /** 100 requests per minute for public API routes */
  public: { maxTokens: 100, refillRate: 100 / 60 } satisfies RateLimitConfig,
  /** 20 requests per minute for upload/validate */
  upload: { maxTokens: 20, refillRate: 20 / 60 } satisfies RateLimitConfig,
  /** 10 requests per minute for auth token endpoints */
  auth: { maxTokens: 10, refillRate: 10 / 60 } satisfies RateLimitConfig,
};

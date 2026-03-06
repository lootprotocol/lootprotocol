import { describe, it, expect } from 'vitest';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests under the limit', () => {
    const config = { maxTokens: 5, refillRate: 5 };
    const result = rateLimit('test-allow-1', config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfter).toBe(0);
  });

  it('rejects requests when bucket is exhausted', () => {
    const config = { maxTokens: 2, refillRate: 0.1 }; // slow refill
    const key = 'test-exhaust-1';

    // Drain the bucket
    rateLimit(key, config); // remaining: 1
    rateLimit(key, config); // remaining: 0

    const result = rateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    const config = { maxTokens: 1, refillRate: 0.01 };

    const r1 = rateLimit('test-key-a', config);
    const r2 = rateLimit('test-key-b', config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it('has correct preset configs', () => {
    expect(RATE_LIMITS.public.maxTokens).toBe(100);
    expect(RATE_LIMITS.upload.maxTokens).toBe(20);
    expect(RATE_LIMITS.auth.maxTokens).toBe(10);
  });
});

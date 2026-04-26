import { describe, it, expect } from 'vitest';
import { RATE_LIMIT_TIERS } from '../rate-limiter';

describe('Rate Limiter Configuration', () => {
  it('should have auth tier configured', () => {
    expect(RATE_LIMIT_TIERS.auth).toBeDefined();
    expect(RATE_LIMIT_TIERS.auth.maxRequests).toBe(10);
    expect(RATE_LIMIT_TIERS.auth.windowMs).toBe(15 * 60 * 1000);
  });

  it('should have api tier configured', () => {
    expect(RATE_LIMIT_TIERS.api).toBeDefined();
    expect(RATE_LIMIT_TIERS.api.maxRequests).toBe(60);
  });

  it('should have ai tier with stricter limits', () => {
    expect(RATE_LIMIT_TIERS.ai).toBeDefined();
    expect(RATE_LIMIT_TIERS.ai.maxRequests).toBeLessThan(RATE_LIMIT_TIERS.api.maxRequests);
  });

  it('should have upload tier configured', () => {
    expect(RATE_LIMIT_TIERS.upload).toBeDefined();
    expect(RATE_LIMIT_TIERS.upload.maxRequests).toBe(20);
  });

  it('should have tracking tier configured', () => {
    expect(RATE_LIMIT_TIERS.tracking).toBeDefined();
    expect(RATE_LIMIT_TIERS.tracking.maxRequests).toBe(30);
  });
});

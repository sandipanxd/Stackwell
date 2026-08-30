import {
  getLimitForPlan,
  PUBLIC_RATE_LIMIT,
  RATE_LIMIT_TTL_MS,
} from './plan-limits';

describe('getLimitForPlan', () => {
  it('returns the free-tier limit for the free plan', () => {
    expect(getLimitForPlan('free')).toBe(30);
  });

  it('returns the pro-tier limit for the pro plan', () => {
    expect(getLimitForPlan('pro')).toBe(120);
  });

  it('returns the enterprise-tier limit for the enterprise plan', () => {
    expect(getLimitForPlan('enterprise')).toBe(600);
  });

  it('falls back to the free-tier limit when no plan is given', () => {
    expect(getLimitForPlan(undefined)).toBe(30);
  });
});

describe('constants', () => {
  it('exposes a public rate limit and a shared TTL window', () => {
    expect(PUBLIC_RATE_LIMIT).toBe(10);
    expect(RATE_LIMIT_TTL_MS).toBe(60_000);
  });
});

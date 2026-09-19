import { validateEnv } from './env.validation';

const validConfig = {
  MONGODB_URI: 'mongodb://localhost:27017/stackwell',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  REDIS_URL: 'redis://localhost:6379',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
};

describe('validateEnv', () => {
  it('returns a parsed config when all required vars are present', () => {
    const result = validateEnv(validConfig);
    expect(result.MONGODB_URI).toBe(validConfig.MONGODB_URI);
    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
  });

  it('throws when a required var is missing', () => {
    const incomplete: Record<string, unknown> = { ...validConfig };
    delete incomplete.MONGODB_URI;
    expect(() => validateEnv(incomplete)).toThrow(
      'Invalid environment configuration',
    );
  });

  it('throws when JWT secrets are shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...validConfig, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow('Invalid environment configuration');
  });

  it('leaves STRIPE_PRICE_PRO and STRIPE_PRICE_ENTERPRISE undefined when not set', () => {
    const result = validateEnv(validConfig);
    expect(result.STRIPE_PRICE_PRO).toBeUndefined();
    expect(result.STRIPE_PRICE_ENTERPRISE).toBeUndefined();
  });

  it('accepts STRIPE_PRICE_PRO and STRIPE_PRICE_ENTERPRISE when set', () => {
    const result = validateEnv({
      ...validConfig,
      STRIPE_PRICE_PRO: 'price_pro_123',
      STRIPE_PRICE_ENTERPRISE: 'price_enterprise_123',
    });
    expect(result.STRIPE_PRICE_PRO).toBe('price_pro_123');
    expect(result.STRIPE_PRICE_ENTERPRISE).toBe('price_enterprise_123');
  });
});

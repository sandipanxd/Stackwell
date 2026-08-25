import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { EnvConfig } from '../../../config/env.validation';

describe('JwtStrategy', () => {
  it('returns the request-user shape from the token payload', () => {
    const configService = {
      get: jest.fn().mockReturnValue('access-secret'),
    } as unknown as ConfigService<EnvConfig, true>;

    const strategy = new JwtStrategy(configService);

    const result = strategy.validate({
      sub: 'user-id',
      tenantId: 'tenant-id',
      role: 'member',
    });

    expect(result).toEqual({
      userId: 'user-id',
      tenantId: 'tenant-id',
      role: 'member',
    });
  });
});

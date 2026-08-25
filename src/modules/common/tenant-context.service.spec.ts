import { UnauthorizedException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { RequestWithUser } from './request-with-user';

describe('TenantContextService', () => {
  const buildRequest = (user?: RequestWithUser['user']): RequestWithUser =>
    ({ user }) as RequestWithUser;

  describe('getTenantId', () => {
    it('returns the tenantId from the authenticated request user', () => {
      const service = new TenantContextService(
        buildRequest({ userId: 'u1', tenantId: 't1', role: 'member' }),
      );

      expect(service.getTenantId()).toBe('t1');
    });

    it('throws UnauthorizedException when there is no authenticated user on the request', () => {
      const service = new TenantContextService(buildRequest(undefined));

      expect(() => service.getTenantId()).toThrow(UnauthorizedException);
    });
  });

  describe('scope', () => {
    it('merges tenantId into an arbitrary filter object', () => {
      const service = new TenantContextService(
        buildRequest({ userId: 'u1', tenantId: 't1', role: 'member' }),
      );

      const result = service.scope({ status: 'active' });

      expect(result).toEqual({ status: 'active', tenantId: 't1' });
    });

    it('overrides any tenantId already present in the filter with the request tenant', () => {
      const service = new TenantContextService(
        buildRequest({ userId: 'u1', tenantId: 't1', role: 'member' }),
      );

      const result = service.scope({ tenantId: 'attacker-supplied' });

      expect(result).toEqual({ tenantId: 't1' });
    });
  });
});

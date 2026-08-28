import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
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
    const tenantId = new Types.ObjectId().toString();

    it('merges tenantId into an arbitrary filter object, cast to an ObjectId', () => {
      const service = new TenantContextService(
        buildRequest({ userId: 'u1', tenantId, role: 'member' }),
      );

      const result = service.scope({ status: 'active' });

      expect(result.status).toBe('active');
      expect(result.tenantId).toBeInstanceOf(Types.ObjectId);
      expect(result.tenantId.toString()).toBe(tenantId);
    });

    it('overrides any tenantId already present in the filter with the request tenant', () => {
      const service = new TenantContextService(
        buildRequest({ userId: 'u1', tenantId, role: 'member' }),
      );

      const result = service.scope({ tenantId: 'attacker-supplied' });

      expect(result.tenantId.toString()).toBe(tenantId);
    });
  });
});

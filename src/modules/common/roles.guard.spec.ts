import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RequestWithUser } from './request-with-user';

describe('RolesGuard', () => {
  const buildContext = (user?: RequestWithUser['user']): ExecutionContext => {
    const request = { user } as RequestWithUser;
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('allows the request when the route has no @Roles() metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const result = guard.canActivate(
      buildContext({ userId: 'u1', tenantId: 't1', role: 'member' }),
    );

    expect(result).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner', 'admin']),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const result = guard.canActivate(
      buildContext({ userId: 'u1', tenantId: 't1', role: 'admin' }),
    );

    expect(result).toBe(true);
  });

  it('denies the request when the user does not have a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner', 'admin']),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const result = guard.canActivate(
      buildContext({ userId: 'u1', tenantId: 't1', role: 'member' }),
    );

    expect(result).toBe(false);
  });

  it('denies the request when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner']),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const result = guard.canActivate(buildContext(undefined));

    expect(result).toBe(false);
  });
});

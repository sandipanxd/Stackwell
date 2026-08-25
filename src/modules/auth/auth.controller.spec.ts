import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantContextService } from '../common/tenant-context.service';
import { RequestWithUser } from '../common/request-with-user';

describe('AuthController', () => {
  let controller: AuthController;
  let service: { register: jest.Mock; login: jest.Mock; refresh: jest.Mock };
  let tenantContext: { getTenantId: jest.Mock };

  beforeEach(async () => {
    service = { register: jest.fn(), login: jest.fn(), refresh: jest.fn() };
    tenantContext = { getTenantId: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  describe('register', () => {
    it('delegates to the service with a valid payload', async () => {
      service.register.mockResolvedValue({ email: 'a@b.com' });

      const result = await controller.register({
        tenantSlug: 'acme',
        email: 'a@b.com',
        password: 'password123',
      });

      expect(service.register).toHaveBeenCalledWith({
        tenantSlug: 'acme',
        email: 'a@b.com',
        password: 'password123',
      });
      expect(result).toEqual({ email: 'a@b.com' });
    });

    it('rejects an invalid payload without calling the service', async () => {
      await expect(
        controller.register({
          tenantSlug: 'acme',
          email: 'not-an-email',
          password: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(service.register).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('delegates to the service with a valid payload', async () => {
      service.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });

      const result = await controller.login({
        tenantSlug: 'acme',
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result).toEqual({ accessToken: 'a', refreshToken: 'b' });
    });

    it('rejects an invalid payload without calling the service', async () => {
      await expect(
        controller.login({ tenantSlug: '', email: 'a@b.com', password: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(service.login).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('delegates to the service with a valid payload', () => {
      service.refresh.mockReturnValue({ accessToken: 'new-token' });

      const result = controller.refresh({ refreshToken: 'valid-token' });

      expect(result).toEqual({ accessToken: 'new-token' });
    });

    it('rejects an invalid payload without calling the service', () => {
      expect(() => controller.refresh({ refreshToken: '' })).toThrow(
        BadRequestException,
      );
      expect(service.refresh).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns the current user identity scoped to their tenant', () => {
      tenantContext.getTenantId.mockReturnValue('tenant-id');
      const req = {
        user: { userId: 'user-id', tenantId: 'tenant-id', role: 'owner' },
      } as RequestWithUser;

      const result = controller.me(req);

      expect(result).toEqual({
        userId: 'user-id',
        role: 'owner',
        tenantId: 'tenant-id',
      });
    });
  });
});

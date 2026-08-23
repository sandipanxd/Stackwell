import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { User } from '../users/schemas/user.schema';
import { TenantsService } from '../tenants/tenants.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userModel: { findOne: jest.Mock; create: jest.Mock };
  let tenantsService: { findBySlug: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };

  const tenant = { _id: new Types.ObjectId(), slug: 'acme' };

  beforeEach(async () => {
    userModel = { findOne: jest.fn(), create: jest.fn() };
    tenantsService = { findBySlug: jest.fn() };
    jwtService = { sign: jest.fn(), verify: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '7d',
        };
        return values[key];
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: TenantsService, useValue: tenantsService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a user with a hashed password when the tenant exists', async () => {
      tenantsService.findBySlug.mockResolvedValue(tenant);
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      userModel.create.mockResolvedValue({
        tenantId: tenant._id,
        email: 'owner@acme.com',
        role: 'member',
      });

      const result = await service.register({
        tenantSlug: 'acme',
        email: 'owner@acme.com',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userModel.create).toHaveBeenCalledWith({
        tenantId: tenant._id,
        email: 'owner@acme.com',
        passwordHash: 'hashed-password',
        role: 'member',
      });
      expect(result.email).toBe('owner@acme.com');
    });

    it('throws NotFoundException when the tenant does not exist', async () => {
      tenantsService.findBySlug.mockResolvedValue(null);

      await expect(
        service.register({
          tenantSlug: 'missing',
          email: 'a@b.com',
          password: 'password123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('login', () => {
    it('returns an access and refresh token for valid credentials', async () => {
      tenantsService.findBySlug.mockResolvedValue(tenant);
      userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        tenantId: tenant._id,
        email: 'owner@acme.com',
        passwordHash: 'hashed-password',
        role: 'owner',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login({
        tenantSlug: 'acme',
        email: 'owner@acme.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      tenantsService.findBySlug.mockResolvedValue(tenant);
      userModel.findOne.mockResolvedValue({
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          tenantSlug: 'acme',
          email: 'x@acme.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no user matches', async () => {
      tenantsService.findBySlug.mockResolvedValue(tenant);
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          tenantSlug: 'acme',
          email: 'x@acme.com',
          password: 'whatever',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('issues a new access token for a valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-id',
        tenantId: 'tenant-id',
        role: 'member',
        iat: 1700000000,
        exp: 1700000900,
      });
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh({
        refreshToken: 'valid-refresh-token',
      });

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'refresh-secret',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-id', tenantId: 'tenant-id', role: 'member' },
        expect.anything(),
      );
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('throws UnauthorizedException for an invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

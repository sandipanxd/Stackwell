import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { TenantContextService } from '../common/tenant-context.service';
import { TenantsService } from '../tenants/tenants.service';
import { MailService } from '../mail/mail.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userModel: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock };
  let tenantContext: { getTenantId: jest.Mock; scope: jest.Mock };
  let tenantsService: { findById: jest.Mock };
  let mailService: { queueInviteEmail: jest.Mock };

  const tenantId = new Types.ObjectId().toString();

  beforeEach(async () => {
    userModel = { find: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    tenantContext = {
      getTenantId: jest.fn().mockReturnValue(tenantId),
      scope: jest.fn((filter: Record<string, unknown>) => ({
        ...filter,
        tenantId,
      })),
    };
    tenantsService = {
      findById: jest.fn().mockResolvedValue({ name: 'Acme' }),
    };
    mailService = { queueInviteEmail: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: TenantsService, useValue: tenantsService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    jest.clearAllMocks();
  });

  describe('findAllForTenant', () => {
    it('lists users scoped to the current tenant', async () => {
      const users = [{ email: 'a@acme.com' }, { email: 'b@acme.com' }];
      userModel.find.mockResolvedValue(users);
      tenantContext.getTenantId.mockReturnValue(tenantId);
      tenantContext.scope.mockReturnValue({ tenantId });

      const result = await service.findAllForTenant();

      expect(tenantContext.scope).toHaveBeenCalledWith({});
      expect(userModel.find).toHaveBeenCalledWith({ tenantId });
      expect(result).toEqual(users);
    });
  });

  describe('invite', () => {
    it('creates a new user scoped to the inviter tenant', async () => {
      tenantContext.getTenantId.mockReturnValue(tenantId);
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      userModel.create.mockResolvedValue({
        tenantId,
        email: 'admin@acme.com',
        role: 'admin',
      });

      const result = await service.invite({
        email: 'admin@acme.com',
        password: 'password123',
        role: 'admin',
      });

      expect(tenantContext.scope).toHaveBeenCalledWith({
        email: 'admin@acme.com',
      });
      expect(tenantContext.scope).toHaveBeenCalledWith({
        email: 'admin@acme.com',
        passwordHash: 'hashed-password',
        role: 'admin',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({
        tenantId,
        email: 'admin@acme.com',
      });
      expect(userModel.create).toHaveBeenCalledWith({
        tenantId,
        email: 'admin@acme.com',
        passwordHash: 'hashed-password',
        role: 'admin',
      });
      expect(result.email).toBe('admin@acme.com');
      expect(mailService.queueInviteEmail).toHaveBeenCalledWith({
        email: 'admin@acme.com',
        tenantName: 'Acme',
        role: 'admin',
      });
    });

    it('throws ConflictException when the email is already used in this tenant', async () => {
      tenantContext.getTenantId.mockReturnValue(tenantId);
      userModel.findOne.mockResolvedValue({ email: 'admin@acme.com' });

      await expect(
        service.invite({
          email: 'admin@acme.com',
          password: 'password123',
          role: 'admin',
        }),
      ).rejects.toThrow(ConflictException);
      expect(userModel.create).not.toHaveBeenCalled();
      expect(mailService.queueInviteEmail).not.toHaveBeenCalled();
    });
  });
});

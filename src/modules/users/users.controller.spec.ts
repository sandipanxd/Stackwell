import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: { findAllForTenant: jest.Mock; invite: jest.Mock };

  beforeEach(async () => {
    service = { findAllForTenant: jest.fn(), invite: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  describe('list', () => {
    it('delegates to the service', async () => {
      const users = [{ email: 'a@acme.com' }];
      service.findAllForTenant.mockResolvedValue(users);

      const result = await controller.list();

      expect(result).toEqual(users);
    });
  });

  describe('invite', () => {
    it('delegates to the service with a valid payload', async () => {
      service.invite.mockResolvedValue({
        email: 'admin@acme.com',
        role: 'admin',
      });

      const result = await controller.invite({
        email: 'admin@acme.com',
        password: 'password123',
        role: 'admin',
      });

      expect(service.invite).toHaveBeenCalledWith({
        email: 'admin@acme.com',
        password: 'password123',
        role: 'admin',
      });
      expect(result).toEqual({ email: 'admin@acme.com', role: 'admin' });
    });

    it('rejects a payload with an invalid role without calling the service', async () => {
      await expect(
        controller.invite({
          email: 'a@b.com',
          password: 'password123',
          role: 'owner',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(service.invite).not.toHaveBeenCalled();
    });

    it('rejects a payload with a missing password without calling the service', async () => {
      await expect(
        controller.invite({ email: 'a@b.com', role: 'admin' }),
      ).rejects.toThrow(BadRequestException);
      expect(service.invite).not.toHaveBeenCalled();
    });
  });
});

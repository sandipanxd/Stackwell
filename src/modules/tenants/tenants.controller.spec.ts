import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(TenantsController);
  });

  describe('signup', () => {
    it('creates a tenant when the payload is valid', async () => {
      const created = { name: 'Acme', slug: 'acme', plan: 'free' };
      service.create.mockResolvedValue(created);

      const result = await controller.signup({ name: 'Acme', slug: 'acme' });

      expect(service.create).toHaveBeenCalledWith({
        name: 'Acme',
        slug: 'acme',
      });
      expect(result).toEqual(created);
    });

    it('rejects a payload with an invalid slug', async () => {
      await expect(
        controller.signup({ name: 'Acme', slug: 'Not Valid!' }),
      ).rejects.toThrow(BadRequestException);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('rejects a payload missing required fields', async () => {
      await expect(controller.signup({ name: '' } as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).not.toHaveBeenCalled();
    });
  });
});

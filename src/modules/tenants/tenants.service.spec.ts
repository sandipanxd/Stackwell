import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { TenantsService } from './tenants.service';
import { Tenant } from './schemas/tenant.schema';

describe('TenantsService', () => {
  let service: TenantsService;
  let model: { findOne: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    model = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getModelToken(Tenant.name), useValue: model },
      ],
    }).compile();

    service = moduleRef.get(TenantsService);
  });

  describe('create', () => {
    it('creates a tenant with the default plan when the slug is free', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue({
        name: 'Acme',
        slug: 'acme',
        plan: 'free',
      });

      const result = await service.create({ name: 'Acme', slug: 'acme' });

      expect(model.create).toHaveBeenCalledWith({
        name: 'Acme',
        slug: 'acme',
        plan: 'free',
      });
      expect(result.slug).toBe('acme');
    });

    it('throws a ConflictException when the slug is already taken', async () => {
      model.findOne.mockResolvedValue({ slug: 'acme' });

      await expect(
        service.create({ name: 'Acme Two', slug: 'acme' }),
      ).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('returns the tenant when found', async () => {
      model.findOne.mockResolvedValue({ slug: 'acme' });

      const result = await service.findBySlug('acme');

      expect(model.findOne).toHaveBeenCalledWith({ slug: 'acme' });
      expect(result?.slug).toBe('acme');
    });

    it('returns null when no tenant matches', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.findBySlug('missing');

      expect(result).toBeNull();
    });
  });
});

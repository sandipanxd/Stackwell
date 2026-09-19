import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { TenantsService } from './tenants.service';
import { Tenant } from './schemas/tenant.schema';

describe('TenantsService', () => {
  let service: TenantsService;
  let model: {
    findOne: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
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

  describe('findById', () => {
    it('returns the tenant when found', async () => {
      model.findById.mockResolvedValue({ _id: 'tenant-1', slug: 'acme' });

      const result = await service.findById('tenant-1');

      expect(model.findById).toHaveBeenCalledWith('tenant-1');
      expect(result?.slug).toBe('acme');
    });

    it('returns null when no tenant matches', async () => {
      model.findById.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('updateBilling', () => {
    it('updates the given billing fields and returns the updated tenant', async () => {
      model.findByIdAndUpdate.mockResolvedValue({
        _id: 'tenant-1',
        plan: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      });

      const result = await service.updateBilling('tenant-1', {
        plan: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'tenant-1',
        {
          plan: 'pro',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
        },
        { new: true },
      );
      expect(result?.plan).toBe('pro');
    });

    it('returns null when the tenant does not exist', async () => {
      model.findByIdAndUpdate.mockResolvedValue(null);

      const result = await service.updateBilling('missing', { plan: 'free' });

      expect(result).toBeNull();
    });
  });
});

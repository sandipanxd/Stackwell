import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { BillingService } from './billing.service';
import { STRIPE_CLIENT } from './stripe-client.provider';
import { TenantsService } from '../tenants/tenants.service';

describe('BillingService', () => {
  let service: BillingService;
  let stripe: {
    customers: { create: jest.Mock };
    checkout: { sessions: { create: jest.Mock } };
    webhooks: { constructEvent: jest.Mock };
  };
  let tenantsService: { findById: jest.Mock; updateBilling: jest.Mock };
  let configService: { get: jest.Mock };
  let webhookQueue: { add: jest.Mock };

  beforeEach(async () => {
    stripe = {
      customers: { create: jest.fn() },
      checkout: { sessions: { create: jest.fn() } },
      webhooks: { constructEvent: jest.fn() },
    };
    tenantsService = { findById: jest.fn(), updateBilling: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          STRIPE_PRICE_PRO: 'price_pro_123',
          STRIPE_PRICE_ENTERPRISE: 'price_enterprise_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
        };
        return values[key];
      }),
    };
    webhookQueue = { add: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: TenantsService, useValue: tenantsService },
        { provide: ConfigService, useValue: configService },
        { provide: getQueueToken('webhook-events'), useValue: webhookQueue },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
  });

  describe('createCheckoutSession', () => {
    const tenant = { _id: 'tenant-1', slug: 'acme', plan: 'free' };

    it('throws NotFoundException when the tenant does not exist', async () => {
      tenantsService.findById.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('missing', 'pro'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ServiceUnavailableException when the plan has no configured price', async () => {
      tenantsService.findById.mockResolvedValue(tenant);
      configService.get.mockReturnValue(undefined);

      await expect(
        service.createCheckoutSession('tenant-1', 'pro'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('creates a new Stripe customer when the tenant has none, and reuses it', async () => {
      tenantsService.findById.mockResolvedValue(tenant);
      stripe.customers.create.mockResolvedValue({ id: 'cus_new' });
      stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session1',
      });

      const result = await service.createCheckoutSession('tenant-1', 'pro');

      expect(stripe.customers.create).toHaveBeenCalledWith({
        metadata: { tenantId: 'tenant-1' },
      });
      expect(tenantsService.updateBilling).toHaveBeenCalledWith('tenant-1', {
        stripeCustomerId: 'cus_new',
      });
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session1' });
    });

    it('reuses an existing Stripe customer without creating a new one', async () => {
      tenantsService.findById.mockResolvedValue({
        ...tenant,
        stripeCustomerId: 'cus_existing',
      });
      stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session2',
      });

      await service.createCheckoutSession('tenant-1', 'pro');

      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_existing' }),
      );
    });

    it('creates the session with the mapped price and metadata for routing webhooks', async () => {
      tenantsService.findById.mockResolvedValue({
        ...tenant,
        stripeCustomerId: 'cus_existing',
      });
      stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session3',
      });

      await service.createCheckoutSession('tenant-1', 'enterprise');

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_enterprise_123', quantity: 1 }],
          client_reference_id: 'tenant-1',
          metadata: { tenantId: 'tenant-1', plan: 'enterprise' },
          subscription_data: {
            metadata: { tenantId: 'tenant-1', plan: 'enterprise' },
          },
        }),
      );
    });
  });

  describe('handleWebhookEvent', () => {
    const rawBody = Buffer.from('{}');
    const signature = 'valid-signature';

    it('throws BadRequestException when the signature is invalid, without enqueueing', async () => {
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(
        service.handleWebhookEvent(rawBody, signature),
      ).rejects.toThrow(BadRequestException);
      expect(webhookQueue.add).not.toHaveBeenCalled();
    });

    it('enqueues the verified event for processing instead of handling it inline', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_1',
            subscription: 'sub_1',
            metadata: { tenantId: 'tenant-1', plan: 'pro' },
          },
        },
      };
      stripe.webhooks.constructEvent.mockReturnValue(event);

      await service.handleWebhookEvent(rawBody, signature);

      expect(webhookQueue.add).toHaveBeenCalledWith('process', event);
      expect(tenantsService.updateBilling).not.toHaveBeenCalled();
    });
  });

  describe('processWebhookEvent', () => {
    it('syncs the tenant plan on checkout.session.completed', async () => {
      await service.processWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_1',
            subscription: 'sub_1',
            metadata: { tenantId: 'tenant-1', plan: 'pro' },
          },
        },
      } as never);

      expect(tenantsService.updateBilling).toHaveBeenCalledWith('tenant-1', {
        plan: 'pro',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
      });
    });

    it('syncs the tenant plan on customer.subscription.updated', async () => {
      await service.processWebhookEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            metadata: { tenantId: 'tenant-1', plan: 'enterprise' },
          },
        },
      } as never);

      expect(tenantsService.updateBilling).toHaveBeenCalledWith('tenant-1', {
        plan: 'enterprise',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
      });
    });

    it('downgrades the tenant to free on customer.subscription.deleted', async () => {
      await service.processWebhookEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { tenantId: 'tenant-1' },
          },
        },
      } as never);

      expect(tenantsService.updateBilling).toHaveBeenCalledWith('tenant-1', {
        plan: 'free',
        stripeSubscriptionId: undefined,
      });
    });

    it('no-ops on unhandled event types', async () => {
      await service.processWebhookEvent({
        type: 'invoice.paid',
        data: { object: {} },
      } as never);

      expect(tenantsService.updateBilling).not.toHaveBeenCalled();
    });
  });
});

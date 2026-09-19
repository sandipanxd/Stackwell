import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { RequestWithUser } from '../common/request-with-user';

describe('BillingController', () => {
  let controller: BillingController;
  let service: {
    createCheckoutSession: jest.Mock;
    handleWebhookEvent: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createCheckoutSession: jest.fn(),
      handleWebhookEvent: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: service }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(BillingController);
  });

  describe('checkout', () => {
    it('delegates to the service with the caller tenant and a valid plan', async () => {
      service.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/x',
      });
      const req = {
        user: { userId: 'u1', tenantId: 't1', role: 'owner' },
      } as RequestWithUser;

      const result = await controller.checkout(req, { plan: 'pro' });

      expect(service.createCheckoutSession).toHaveBeenCalledWith('t1', 'pro');
      expect(result).toEqual({ url: 'https://checkout.stripe.com/x' });
    });

    it('rejects an invalid plan without calling the service', async () => {
      const req = {
        user: { userId: 'u1', tenantId: 't1', role: 'owner' },
      } as RequestWithUser;

      await expect(controller.checkout(req, { plan: 'free' })).rejects.toThrow(
        BadRequestException,
      );
      expect(service.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe('webhook', () => {
    it('passes the raw body and signature through to the service', async () => {
      const rawBody = Buffer.from('{}');
      const req = { rawBody } as never;

      await controller.webhook(req, 'sig-header');

      expect(service.handleWebhookEvent).toHaveBeenCalledWith(
        rawBody,
        'sig-header',
      );
    });
  });
});

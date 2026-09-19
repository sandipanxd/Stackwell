import { Job } from 'bullmq';
import type Stripe from 'stripe';
import { WebhookEventsProcessor } from './webhook-events.processor';
import { BillingService } from './billing.service';

describe('WebhookEventsProcessor', () => {
  it('delegates the job data to BillingService.processWebhookEvent', async () => {
    const billingService = { processWebhookEvent: jest.fn() };
    const processor = new WebhookEventsProcessor(
      billingService as unknown as BillingService,
    );
    const event = {
      type: 'checkout.session.completed',
      data: { object: {} },
    } as Stripe.Event;
    const job = { data: event } as Job<Stripe.Event>;

    await processor.process(job);

    expect(billingService.processWebhookEvent).toHaveBeenCalledWith(event);
  });
});

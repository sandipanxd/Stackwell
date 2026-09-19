import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type Stripe from 'stripe';
import { BillingService } from './billing.service';

@Processor('webhook-events')
export class WebhookEventsProcessor extends WorkerHost {
  constructor(private readonly billingService: BillingService) {
    super();
  }

  async process(job: Job<Stripe.Event>): Promise<void> {
    await this.billingService.processWebhookEvent(job.data);
  }
}

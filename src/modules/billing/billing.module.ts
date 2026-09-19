import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { stripeClientProvider } from './stripe-client.provider';
import { WebhookEventsProcessor } from './webhook-events.processor';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TenantsModule,
    BullModule.registerQueue({
      name: 'webhook-events',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  controllers: [BillingController],
  providers: [BillingService, stripeClientProvider, WebhookEventsProcessor],
})
export class BillingModule {}

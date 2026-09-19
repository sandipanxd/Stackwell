import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { stripeClientProvider } from './stripe-client.provider';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [BillingController],
  providers: [BillingService, stripeClientProvider],
})
export class BillingModule {}

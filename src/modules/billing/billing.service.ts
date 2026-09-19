import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the stripe package's CJS export has no `.default`, and this tsconfig lacks esModuleInterop, so a default import resolves to undefined at runtime.
import Stripe = require('stripe');
import { STRIPE_CLIENT } from './stripe-client.provider';
import { TenantsService } from '../tenants/tenants.service';
import { TenantPlan } from '../tenants/schemas/tenant.schema';
import { EnvConfig } from '../../config/env.validation';

type BillablePlan = Extract<TenantPlan, 'pro' | 'enterprise'>;

const PRICE_ENV_KEY: Record<
  BillablePlan,
  'STRIPE_PRICE_PRO' | 'STRIPE_PRICE_ENTERPRISE'
> = {
  pro: 'STRIPE_PRICE_PRO',
  enterprise: 'STRIPE_PRICE_ENTERPRISE',
};

@Injectable()
export class BillingService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async createCheckoutSession(
    tenantId: string,
    plan: BillablePlan,
  ): Promise<{ url: string }> {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" not found`);
    }

    const priceId = this.configService.get(PRICE_ENV_KEY[plan], {
      infer: true,
    });
    if (!priceId) {
      throw new ServiceUnavailableException(
        `Billing is not configured for the "${plan}" plan (missing ${PRICE_ENV_KEY[plan]})`,
      );
    }

    let stripeCustomerId = tenant.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        metadata: { tenantId },
      });
      stripeCustomerId = customer.id;
      await this.tenantsService.updateBilling(tenantId, { stripeCustomerId });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: tenantId,
      metadata: { tenantId, plan },
      subscription_data: { metadata: { tenantId, plan } },
      success_url: 'http://localhost:3000/billing/success',
      cancel_url: 'http://localhost:3000/billing/cancel',
    });

    return { url: session.url! };
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true }),
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { tenantId, plan } = session.metadata as {
          tenantId: string;
          plan: TenantPlan;
        };
        await this.tenantsService.updateBilling(tenantId, {
          plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { tenantId, plan } = subscription.metadata as {
          tenantId: string;
          plan: TenantPlan;
        };
        await this.tenantsService.updateBilling(tenantId, {
          plan,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { tenantId } = subscription.metadata as { tenantId: string };
        await this.tenantsService.updateBilling(tenantId, {
          plan: 'free',
          stripeSubscriptionId: undefined,
        });
        break;
      }
      default:
        break;
    }
  }
}

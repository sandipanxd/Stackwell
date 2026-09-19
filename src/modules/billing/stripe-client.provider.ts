import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the stripe package's CJS export has no `.default`, and this tsconfig lacks esModuleInterop, so a default import resolves to undefined at runtime.
import Stripe = require('stripe');
import { EnvConfig } from '../../config/env.validation';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const stripeClientProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<EnvConfig, true>) =>
    new Stripe(configService.get('STRIPE_SECRET_KEY', { infer: true })),
};

import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
});
export type CreateCheckoutSessionDto = z.infer<
  typeof createCheckoutSessionSchema
>;

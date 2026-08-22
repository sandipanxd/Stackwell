import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(
      /^[a-z0-9-]+$/,
      'slug must be lowercase alphanumeric with hyphens only',
    ),
});

export type CreateTenantDto = z.infer<typeof createTenantSchema>;

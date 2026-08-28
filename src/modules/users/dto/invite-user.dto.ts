import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'member']),
});
export type InviteUserDto = z.infer<typeof inviteUserSchema>;

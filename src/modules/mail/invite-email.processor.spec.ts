import { Job } from 'bullmq';
import { InviteEmailProcessor } from './invite-email.processor';
import { InviteEmailJob } from './mail.service';

describe('InviteEmailProcessor', () => {
  it('processes an invite job without throwing', async () => {
    const processor = new InviteEmailProcessor();
    const job = {
      name: 'invite',
      data: { email: 'teammate@acme.com', tenantName: 'Acme', role: 'member' },
    } as Job<InviteEmailJob>;

    await expect(processor.process(job)).resolves.toBeUndefined();
  });
});

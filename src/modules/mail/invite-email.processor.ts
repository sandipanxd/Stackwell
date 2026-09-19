import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InviteEmailJob } from './mail.service';

@Processor('mail')
export class InviteEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(InviteEmailProcessor.name);

  process(job: Job<InviteEmailJob>): Promise<void> {
    const { email, tenantName, role } = job.data;
    // No real email provider is wired up yet (no SMTP/SendGrid credentials configured).
    // This logs the would-be invite email to demonstrate the queue/worker flow.
    this.logger.log(
      `Simulated invite email → ${email}: you've been invited to join "${tenantName}" as ${role}`,
    );
    return Promise.resolve();
  }
}

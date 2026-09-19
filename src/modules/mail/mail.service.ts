import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserRole } from '../users/schemas/user.schema';

export interface InviteEmailJob {
  email: string;
  tenantName: string;
  role: UserRole;
}

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue<InviteEmailJob>,
  ) {}

  async queueInviteEmail(job: InviteEmailJob): Promise<void> {
    await this.mailQueue.add('invite', job);
  }
}

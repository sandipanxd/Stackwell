import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { InviteEmailProcessor } from './invite-email.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'mail' })],
  providers: [MailService, InviteEmailProcessor],
  exports: [MailService],
})
export class MailModule {}

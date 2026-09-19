import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    queue = { add: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: getQueueToken('mail'), useValue: queue },
      ],
    }).compile();

    service = moduleRef.get(MailService);
  });

  describe('queueInviteEmail', () => {
    it('enqueues an invite job with the given details', async () => {
      await service.queueInviteEmail({
        email: 'teammate@acme.com',
        tenantName: 'Acme',
        role: 'member',
      });

      expect(queue.add).toHaveBeenCalledWith('invite', {
        email: 'teammate@acme.com',
        tenantName: 'Acme',
        role: 'member',
      });
    });
  });
});

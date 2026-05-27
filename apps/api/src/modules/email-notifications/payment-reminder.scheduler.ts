import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PAYMENT_REMINDER_QUEUE } from './payment-reminder.constants';

@Injectable()
export class PaymentReminderScheduler {
  private readonly logger = new Logger(PaymentReminderScheduler.name);

  constructor(@InjectQueue(PAYMENT_REMINDER_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJob() {
    await this.queue.add(
      'daily-payment-reminders',
      {},
      {
        repeat: { pattern: '0 8 * * *' },
        jobId: 'daily-payment-reminders',
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
    this.logger.log('Scheduled daily payment reminder job (08:00 UTC)');
  }
}

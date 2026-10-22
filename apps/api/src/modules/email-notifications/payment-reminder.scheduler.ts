import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PAYMENT_REMINDER_QUEUE } from './payment-reminder.constants';
import { removeStaleJobSchedulers } from '../../common/queue/job-schedulers';

@Injectable()
export class PaymentReminderScheduler {
  private readonly logger = new Logger(PaymentReminderScheduler.name);

  constructor(@InjectQueue(PAYMENT_REMINDER_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJob() {
    await removeStaleJobSchedulers(this.queue, ['daily-payment-reminders']);
    await this.queue.upsertJobScheduler(
      'daily-payment-reminders',
      { pattern: '0 8 * * *' },
      { name: 'daily-payment-reminders', data: {}, opts: { removeOnComplete: 20, removeOnFail: 20 } },
    );
    this.logger.log('Scheduled daily payment reminder job (08:00 UTC)');
  }
}

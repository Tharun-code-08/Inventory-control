import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { NotificationJob } from './notifications.processor';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications') private readonly queue: Queue<NotificationJob>,
  ) {}

  /**
   * Enqueue a notification dispatch. Uses `alertEventId` as the BullMQ jobId
   * so duplicate produces (e.g. retries by the alerts automation job) are
   * deduplicated by the broker rather than each producing an independent
   * delivery attempt.
   */
  async enqueue(payload: NotificationJob): Promise<void> {
    await this.queue.add('alert.delivery', payload, {
      jobId: `alert:${payload.alertEventId}`,
    });
  }
}

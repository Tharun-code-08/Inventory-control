import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { JobFailureService } from '../../common/queues/job-failure.service';
import { MetricsService } from '../../common/observability/metrics.service';

export type NotificationJob = {
  alertEventId: string;
  alertType: string;
  title: string;
  message: string;
  shopId: string | null;
  severity?: string;
};

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly config: ConfigService,
    private readonly failures: JobFailureService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationJob>) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration
      .labels('notifications', String(job.name), 'completed')
      .observe(Math.max(0, durationSec));
  }

  async process(job: Job<NotificationJob>): Promise<{ delivered: boolean; statusCode?: number }> {
    const url = this.config.get<string>('NOTIFICATIONS_WEBHOOK_URL')?.trim();
    if (!url) {
      // No webhook configured: ack and move on. Alerts remain in DB for the SPA.
      return { delivered: false };
    }
    const payload = {
      type: 'alert',
      alertEventId: job.data.alertEventId,
      alertType: job.data.alertType,
      title: job.data.title,
      message: job.data.message,
      shopId: job.data.shopId,
      severity: job.data.severity ?? 'MEDIUM',
      attempt: job.attemptsMade + 1,
      timestamp: new Date().toISOString(),
    };
    const controller = new AbortController();
    const timeoutMs = Number(this.config.get<string | number>('NOTIFICATIONS_TIMEOUT_MS') ?? 5_000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status}`);
      }
      return { delivered: true, statusCode: res.status };
    } finally {
      clearTimeout(timeout);
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<NotificationJob>, err: Error) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration
      .labels('notifications', String(job.name), 'failed')
      .observe(Math.max(0, durationSec));
    await this.failures.record(job, err);
  }
}

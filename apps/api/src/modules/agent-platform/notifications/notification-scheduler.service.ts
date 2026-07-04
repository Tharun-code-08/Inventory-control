import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import {
  DEFAULT_DAILY_SUMMARY_CRON,
  DEFAULT_LOW_STOCK_CRON,
  DEFAULT_OVERDUE_PAYMENT_CRON,
  NOTIFICATION_QUEUE,
  type NotificationJob,
} from './notification-jobs';

/**
 * Registers BullMQ repeatable jobs (one per notification type per company)
 * at application startup. Idempotent — BullMQ deduplicates by key so a
 * restart doesn't add duplicate schedules.
 */
@Injectable()
export class NotificationSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue<NotificationJob>,
  ) {}

  async onApplicationBootstrap() {
    if (!this.notificationsEnabled()) return;
    try {
      await this.scheduleAll();
    } catch (err) {
      // Scheduling failures must never block the app from starting.
      this.logger.error(`Failed to schedule notifications: ${(err as Error).message}`);
    }
  }

  private async scheduleAll() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const company of companies) {
      await this.upsertRepeatable('daily_summary', company.id, this.dailyCron());
      await this.upsertRepeatable('low_stock_alert', company.id, this.lowStockCron());
      await this.upsertRepeatable('overdue_payment', company.id, this.overduePaymentCron());
    }
    this.logger.log(`Notification schedules registered for ${companies.length} company/companies`);
  }

  private async upsertRepeatable(
    type: NotificationJob['type'],
    companyId: string,
    cron: string,
  ) {
    const jobId = `${type}:${companyId}`;
    await this.queue.add(
      type,
      { type, companyId },
      {
        jobId,
        repeat: { pattern: cron },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );
  }

  /**
   * Called when a new company is created so notifications start immediately
   * without a restart. Fire-and-forget — failures are logged, not thrown.
   */
  async scheduleForCompany(companyId: string) {
    if (!this.notificationsEnabled()) return;
    try {
      await this.upsertRepeatable('daily_summary', companyId, this.dailyCron());
      await this.upsertRepeatable('low_stock_alert', companyId, this.lowStockCron());
      await this.upsertRepeatable('overdue_payment', companyId, this.overduePaymentCron());
    } catch (err) {
      this.logger.error(`Failed to schedule notifications for company ${companyId}: ${(err as Error).message}`);
    }
  }

  notificationsEnabled(): boolean {
    return this.config.get<string>('AGENT_NOTIFICATIONS_ENABLED') === 'true';
  }

  private dailyCron(): string {
    return this.config.get<string>('NOTIFICATION_DAILY_SUMMARY_CRON') ?? DEFAULT_DAILY_SUMMARY_CRON;
  }

  private lowStockCron(): string {
    return this.config.get<string>('NOTIFICATION_LOW_STOCK_CRON') ?? DEFAULT_LOW_STOCK_CRON;
  }

  private overduePaymentCron(): string {
    return this.config.get<string>('NOTIFICATION_OVERDUE_PAYMENT_CRON') ?? DEFAULT_OVERDUE_PAYMENT_CRON;
  }
}

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

const NOTIFICATION_TYPES: NotificationJob['type'][] = ['daily_summary', 'low_stock_alert', 'overdue_payment'];

/**
 * Registers BullMQ job schedulers (one per notification type per company) at
 * application startup. Schedulers are keyed by type+company, so a restart or
 * a changed cron updates the schedule in place; schedules that are no longer
 * wanted (feature off, legacy repeatables) are removed.
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
    try {
      if (!this.notificationsEnabled()) {
        await this.removeSchedulers(() => true);
        return;
      }
      await this.scheduleAll();
    } catch (err) {
      // Scheduling failures must never block the app from starting.
      this.logger.error(`Failed to schedule notifications: ${(err as Error).message}`);
    }
  }

  private async scheduleAll() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    const wanted = new Set(
      companies.flatMap((c) => NOTIFICATION_TYPES.map((type) => this.schedulerId(type, c.id))),
    );
    // Drops legacy cron-keyed repeatables and schedules of deleted companies.
    await this.removeSchedulers((key) => !wanted.has(key));
    for (const company of companies) {
      await this.upsertRepeatable('daily_summary', company.id, this.dailyCron());
      await this.upsertRepeatable('low_stock_alert', company.id, this.lowStockCron());
      await this.upsertRepeatable('overdue_payment', company.id, this.overduePaymentCron());
    }
    this.logger.log(`Notification schedules registered for ${companies.length} company/companies`);
  }

  private schedulerId(type: NotificationJob['type'], companyId: string): string {
    return `${type}-${companyId}`;
  }

  private async removeSchedulers(shouldRemove: (key: string) => boolean) {
    const schedulers = await this.queue.getJobSchedulers();
    for (const scheduler of schedulers) {
      if (shouldRemove(scheduler.key)) await this.queue.removeJobScheduler(scheduler.key);
    }
  }

  private async upsertRepeatable(
    type: NotificationJob['type'],
    companyId: string,
    cron: string,
  ) {
    await this.queue.upsertJobScheduler(
      this.schedulerId(type, companyId),
      // Crons are business hours (08:00 daily…), not server time.
      { pattern: cron, tz: this.timezone() },
      {
        name: type,
        data: { type, companyId },
        opts: { removeOnComplete: 50, removeOnFail: 20 },
      },
    );
  }

  private timezone(): string {
    return this.config.get<string>('NOTIFICATION_TIMEZONE') ?? 'Asia/Kolkata';
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

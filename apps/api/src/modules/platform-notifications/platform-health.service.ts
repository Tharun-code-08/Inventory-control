import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import * as os from 'os';
import { statfs } from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../common/observability/metrics.service';
import {
  PlatformNotificationCategory,
  PlatformNotificationSeverity,
} from '@prisma/client';
import { PLATFORM_NOTIFICATION_KEYS } from './platform-notification.constants';
import { PlatformNotificationService } from './platform-notification.service';

const MONITORED_QUEUES = [
  'exports',
  'notifications',
  'backups',
  'subscription-lifecycle',
  'document-email',
  'platform-checks',
] as const;

@Injectable()
export class PlatformHealthService {
  private lastHttpErrorTotal = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
    private readonly notifications: PlatformNotificationService,
  ) {}

  async collectSnapshot() {
    const [dbSize, diskPaths, queueStats, cpuLoad, memoryPct, httpErrors] = await Promise.all([
      this.getDatabaseSizeBytes(),
      this.getDiskUsage(),
      this.getQueueStats(),
      this.getCpuLoadPct(),
      this.getMemoryUsagePct(),
      this.getHttpErrorDelta(),
    ]);

    const dbLimit = Number(
      this.config.get<string>('PLATFORM_DB_LIMIT_BYTES') ??
        process.env.PLATFORM_DB_LIMIT_BYTES ??
        String(10 * 1024 * 1024 * 1024),
    );
    const dbUsagePct = dbLimit > 0 ? (dbSize / dbLimit) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      database: { sizeBytes: dbSize, limitBytes: dbLimit, usagePct: Math.round(dbUsagePct * 10) / 10 },
      disk: diskPaths,
      queues: queueStats,
      cpuLoadPct: Math.round(cpuLoad * 10) / 10,
      memoryUsagePct: Math.round(memoryPct * 10) / 10,
      httpErrorsDelta5m: httpErrors,
    };
  }

  private async getDatabaseSizeBytes() {
    const rows = await this.prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT pg_database_size(current_database()) AS size
    `;
    return Number(rows[0]?.size ?? 0);
  }

  private async getDiskUsage() {
    const dirs = [
      this.config.get<string>('BACKUP_STORAGE_DIR') ?? './storage/backups',
      this.config.get<string>('EXPORT_STORAGE_DIR') ?? './storage/exports',
      this.config.get<string>('UPLOAD_STORAGE_DIR') ?? './storage/uploads',
    ];

    const results: Array<{ path: string; freePct: number; freeBytes: number }> = [];
    for (const dir of dirs) {
      try {
        const resolved = path.resolve(dir);
        const stats = await statfs(resolved);
        const total = Number(stats.blocks) * Number(stats.bsize);
        const free = Number(stats.bfree) * Number(stats.bsize);
        const freePct = total > 0 ? (free / total) * 100 : 100;
        results.push({ path: resolved, freePct: Math.round(freePct * 10) / 10, freeBytes: free });
      } catch {
        results.push({ path: dir, freePct: -1, freeBytes: 0 });
      }
    }
    return results;
  }

  private async getQueueStats() {
    const connection = {
      host: this.config.get<string>('REDIS_HOST') ?? process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(this.config.get<string>('REDIS_PORT') ?? process.env.REDIS_PORT ?? '6379'),
    };

    const stats: Record<string, { waiting: number; active: number; failed: number; delayed: number }> = {};
    for (const name of MONITORED_QUEUES) {
      const queue = new Queue(name, { connection });
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed');
        stats[name] = {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        };
      } catch {
        stats[name] = { waiting: -1, active: -1, failed: -1, delayed: -1 };
      } finally {
        await queue.close();
      }
    }
    return stats;
  }

  private getCpuLoadPct() {
    const cpus = os.cpus().length || 1;
    const load = os.loadavg()[0] ?? 0;
    return Math.min(100, (load / cpus) * 100);
  }

  private getMemoryUsagePct() {
    const total = os.totalmem();
    const used = total - os.freemem();
    return total > 0 ? (used / total) * 100 : 0;
  }

  private async getHttpErrorDelta() {
    const metric = await this.metrics.httpErrors.get();
    const total = metric.values.reduce((sum, row) => sum + row.value, 0);
    const delta = Math.max(0, total - this.lastHttpErrorTotal);
    this.lastHttpErrorTotal = total;
    return delta;
  }

  async runHealthChecks() {
    const snapshot = await this.collectSnapshot();
    let dispatched = 0;

    if (snapshot.database.usagePct >= 90) {
      const result = await this.notifications.dispatch({
        category: PlatformNotificationCategory.HEALTH,
        severity: PlatformNotificationSeverity.CRITICAL,
        notificationKey: PLATFORM_NOTIFICATION_KEYS.DB_STORAGE_90,
        title: 'Database storage critical',
        message: `Database is at ${snapshot.database.usagePct}% of configured limit.`,
        actionUrl: '/platform/subscriptions',
        dedupeHours: 12,
        emailImmediate: true,
        emailDedupe: {
          templateId: 'platform_db_storage_90',
          entityType: 'health',
          entityId: 'db_storage_90',
        },
      });
      if (!('skipped' in result)) dispatched += 1;
    } else if (snapshot.database.usagePct >= 80) {
      const result = await this.notifications.dispatch({
        category: PlatformNotificationCategory.HEALTH,
        severity: PlatformNotificationSeverity.WARNING,
        notificationKey: PLATFORM_NOTIFICATION_KEYS.DB_STORAGE_80,
        title: 'Database storage warning',
        message: `Database is at ${snapshot.database.usagePct}% of configured limit.`,
        actionUrl: '/platform/subscriptions',
        dedupeHours: 24,
        emailImmediate: true,
        emailDedupe: {
          templateId: 'platform_db_storage_80',
          entityType: 'health',
          entityId: 'db_storage_80',
        },
      });
      if (!('skipped' in result)) dispatched += 1;
    }

    if (snapshot.cpuLoadPct >= 80) {
      const result = await this.notifications.dispatch({
        category: PlatformNotificationCategory.HEALTH,
        severity: PlatformNotificationSeverity.WARNING,
        notificationKey: PLATFORM_NOTIFICATION_KEYS.SERVER_CPU_HIGH,
        title: 'Server CPU high',
        message: `CPU load is ${snapshot.cpuLoadPct}% across ${os.cpus().length} cores.`,
        dedupeHours: 1,
        emailImmediate: true,
        emailDedupe: {
          templateId: 'platform_cpu_high',
          entityType: 'health',
          entityId: new Date().toISOString().slice(0, 13),
        },
      });
      if (!('skipped' in result)) dispatched += 1;
    }

    if (snapshot.memoryUsagePct >= 80) {
      const result = await this.notifications.dispatch({
        category: PlatformNotificationCategory.HEALTH,
        severity: PlatformNotificationSeverity.WARNING,
        notificationKey: PLATFORM_NOTIFICATION_KEYS.SERVER_MEMORY_HIGH,
        title: 'Server memory high',
        message: `Memory usage is ${snapshot.memoryUsagePct}%.`,
        dedupeHours: 1,
        emailImmediate: true,
        emailDedupe: {
          templateId: 'platform_memory_high',
          entityType: 'health',
          entityId: new Date().toISOString().slice(0, 13),
        },
      });
      if (!('skipped' in result)) dispatched += 1;
    }

    for (const disk of snapshot.disk) {
      if (disk.freePct >= 0 && disk.freePct < 15) {
        const result = await this.notifications.dispatch({
          category: PlatformNotificationCategory.HEALTH,
          severity: PlatformNotificationSeverity.CRITICAL,
          notificationKey: PLATFORM_NOTIFICATION_KEYS.VPS_DISK_LOW,
          title: 'Disk space low',
          message: `${disk.path} has only ${disk.freePct}% free space.`,
          dedupeHours: 6,
          emailImmediate: true,
          emailDedupe: {
            templateId: 'platform_disk_low',
            entityType: 'path',
            entityId: disk.path.replace(/[^a-zA-Z0-9]/g, '_'),
          },
        });
        if (!('skipped' in result)) dispatched += 1;
      }
    }

    if (snapshot.httpErrorsDelta5m >= 10) {
      const result = await this.notifications.dispatch({
        category: PlatformNotificationCategory.HEALTH,
        severity: PlatformNotificationSeverity.HIGH,
        notificationKey: PLATFORM_NOTIFICATION_KEYS.API_ERROR_RATE_HIGH,
        title: 'API error rate elevated',
        message: `${snapshot.httpErrorsDelta5m} server errors recorded since the last health check.`,
        dedupeHours: 1,
        emailImmediate: true,
        emailDedupe: {
          templateId: 'platform_api_errors',
          entityType: 'health',
          entityId: new Date().toISOString().slice(0, 13),
        },
      });
      if (!('skipped' in result)) dispatched += 1;
    }

    for (const [queueName, counts] of Object.entries(snapshot.queues)) {
      if (counts.failed >= 10 || counts.waiting >= 50) {
        const result = await this.notifications.dispatch({
          category: PlatformNotificationCategory.HEALTH,
          severity: PlatformNotificationSeverity.WARNING,
          notificationKey: `${PLATFORM_NOTIFICATION_KEYS.QUEUE_BACKLOG_HIGH}:${queueName}`,
          title: `Queue backlog: ${queueName}`,
          message: `waiting=${counts.waiting}, failed=${counts.failed}, active=${counts.active}`,
          dedupeHours: 2,
          emailImmediate: false,
        });
        if (!('skipped' in result)) dispatched += 1;
      }
    }

    return { dispatched, snapshot };
  }
}

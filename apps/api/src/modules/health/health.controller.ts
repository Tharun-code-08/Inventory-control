import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Deprecated } from '../../common/decorators/deprecated.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { StockService } from '../stock/stock.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  @Public()
  @Get()
  status() {
    return {
      ok: true,
      service: 'retail-ims-api',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Legacy alias for `/health`. Kept around so existing dashboards/uptime
   * monitors don't break, but flagged as deprecated so we can spot leftover
   * callers via the response headers.
   */
  @Public()
  @Deprecated({
    sunsetAt: '2027-01-01',
    note: 'Use GET /health instead.',
  })
  @Get('status')
  legacyStatus() {
    return this.status();
  }

  /**
   * Public readiness probe. Returns binary `{ ok }` only — exposing per-dep
   * up/down to anonymous callers fingerprinted infra during attacks. Detailed
   * readiness lives at `/health/ready/detail` and is gated on user:manage.
   */
  @Public()
  @Get('ready')
  async readiness() {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.pingRedis(),
    ]);
    const dbOk = dbResult.status === 'fulfilled';
    const redisOk = redisResult.status === 'fulfilled' && redisResult.value === true;

    if (!dbOk || !redisOk) {
      throw new ServiceUnavailableException({ ok: false });
    }
    return { ok: true };
  }

  @ApiBearerAuth()
  @RequirePermission('user:manage')
  @Get('ready/detail')
  async readinessDetail() {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.pingRedis(),
    ]);
    const dbOk = dbResult.status === 'fulfilled';
    const redisOk = redisResult.status === 'fulfilled' && redisResult.value === true;
    return {
      ok: dbOk && redisOk,
      db: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiBearerAuth()
  @RequirePermission('user:manage')
  @Get('queue')
  async queueHealth() {
    const connection = {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? '6379'),
    };
    const exportsQueue = new Queue('exports', { connection });
    const notificationQueue = new Queue('notifications', { connection });
    const [exportsCounts, notificationsCounts] = await Promise.all([
      exportsQueue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed'),
      notificationQueue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed'),
    ]);
    await Promise.all([exportsQueue.close(), notificationQueue.close()]);

    return {
      ok: true,
      queues: {
        exports: exportsCounts,
        notifications: notificationsCounts,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @ApiBearerAuth()
  @RequirePermission('user:manage')
  @Get('stock-reconciliation')
  async stockReconciliation() {
    return this.stock.reconcile();
  }

  @ApiBearerAuth()
  @RequirePermission('user:manage')
  @Get('retention')
  async retentionPreview() {
    const retentionDays = Number(process.env.ALERT_RETENTION_DAYS ?? '90');
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const count = await this.prisma.alertEvent.count({
      where: {
        isRead: true,
        triggeredAt: { lt: cutoff },
      },
    });
    return {
      ok: true,
      retentionDays,
      removableAlertEvents: count,
      cleanupEndpoint: '/api/v1/alerts/retention-run',
    };
  }

  private async pingRedis() {
    const connection = {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? '6379'),
    };
    const queue = new Queue('healthcheck', { connection });
    try {
      await queue.client.then((client) => client.ping());
      return true;
    } finally {
      await queue.close();
    }
  }
}

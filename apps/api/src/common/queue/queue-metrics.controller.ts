import { BadRequestException, Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '@/modules/platform/platform-admin.guard';
import { QueueService } from './queue.service';
import { QueueName } from './job-types';

// Queues are shared by every tenant, so their metrics are platform-admin only.
@ApiTags('queues')
@UseGuards(PlatformAdminGuard)
@Controller('queues')
export class QueueMetricsController {
  private readonly logger = new Logger(QueueMetricsController.name);

  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  async getQueueStats() {
    try {
      const metrics = await this.queueService.getAllMetrics();
      return {
        success: true,
        data: {
          metrics,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch queue stats: ${(error as Error).message}`);
      throw error;
    }
  }

  @Get('stats/:queueName')
  async getQueueStatsByName(@Param('queueName') queueName: string) {
    if (!(Object.values(QueueName) as string[]).includes(queueName)) {
      throw new BadRequestException('Unknown queue');
    }
    try {
      const metric = await this.queueService.getQueueMetrics(queueName as QueueName);
      return {
        success: true,
        data: metric,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch queue stats for ${queueName}: ${(error as Error).message}`);
      throw error;
    }
  }

  @Get('health')
  async getQueuesHealth() {
    try {
      const metrics = await this.queueService.getAllMetrics();
      const totalActive = metrics.reduce((sum, m) => sum + m.active, 0);
      const totalFailed = metrics.reduce((sum, m) => sum + m.failed, 0);
      const totalWaiting = metrics.reduce((sum, m) => sum + m.waiting, 0);

      return {
        success: true,
        data: {
          status: totalFailed > 0 ? 'degraded' : 'healthy',
          totalQueues: metrics.length,
          totalActive,
          totalFailed,
          totalWaiting,
          queues: metrics,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch queues health: ${(error as Error).message}`);
      throw error;
    }
  }
}

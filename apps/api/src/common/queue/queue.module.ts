import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueConfig } from './queue.config';
import { QueueService } from './queue.service';
import { JobTrackerService } from './job-tracker.service';
import { QueueMetricsController } from './queue-metrics.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [QueueConfig, QueueService, JobTrackerService],
  controllers: [QueueMetricsController],
  exports: [QueueService, QueueConfig, JobTrackerService],
})
export class QueueModule {}

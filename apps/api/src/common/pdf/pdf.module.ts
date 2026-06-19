import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { PdfClusterService } from './pdf-cluster.service';
import { PdfRendererService } from './pdf-renderer.service';
import { PdfWorkerProcessor } from './pdf-worker.processor';
import { PdfHealthController } from './pdf-health.controller';

@Module({
  imports: [ConfigModule, PrismaModule, StorageModule, QueueModule],
  providers: [PdfClusterService, PdfRendererService, PdfWorkerProcessor],
  controllers: [PdfHealthController],
  exports: [PdfClusterService, PdfRendererService, PdfWorkerProcessor],
})
export class PdfModule {}

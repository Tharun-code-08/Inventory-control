import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { BrandingModule } from '../branding/branding.module';
import { PdfClusterService } from './pdf-cluster.service';
import { PdfRendererService } from './pdf-renderer.service';
import { PdfWorkerProcessor } from './pdf-worker.processor';
import { DocumentPdfService } from './document-pdf.service';
import { PdfHealthController } from './pdf-health.controller';

@Module({
  imports: [ConfigModule, PrismaModule, StorageModule, QueueModule, BrandingModule],
  providers: [PdfClusterService, PdfRendererService, PdfWorkerProcessor, DocumentPdfService],
  controllers: [PdfHealthController],
  exports: [PdfClusterService, PdfRendererService, PdfWorkerProcessor, DocumentPdfService],
})
export class PdfModule {}

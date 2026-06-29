import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobTrackerService } from '../queue/job-tracker.service';
import { JobPayload, JobStatus, JobResult } from '../queue/job-types';
import { PdfRendererService, RenderContext } from './pdf-renderer.service';
import * as crypto from 'crypto';

@Injectable()
export class PdfWorkerProcessor {
  private readonly logger = new Logger(PdfWorkerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobTracker: JobTrackerService,
    private readonly pdfRenderer: PdfRendererService,
  ) {}

  async processPdfJob(job: Job<JobPayload>): Promise<JobResult> {
    const jobId = job.id as string;
    const { tenantId, documentType, referenceId, metadata, forceRegenerate } = job.data;

    this.logger.log(`Processing job ${jobId}: ${documentType} (ref: ${referenceId || 'none'})`);

    try {
      // [Step 1] Check cache
      const cachedPdf = await this.checkCache(tenantId, documentType, referenceId, metadata);
      if (cachedPdf && !forceRegenerate) {
        this.logger.log(`Cache hit: ${jobId}`);
        return this.createJobResult(cachedPdf);
      }

      // Update status: QUEUED → PROCESSING
      await this.jobTracker.updateJobStatus(jobId, JobStatus.PROCESSING);

      // [Step 2] Render PDF
      const renderStartTime = Date.now();
      const pdfBuffer = await this.renderPdf(tenantId, documentType, referenceId, metadata);
      const renderDurationMs = Date.now() - renderStartTime;

      // [Step 3] Upload to storage
      const uploadStartTime = Date.now();
      await this.jobTracker.updateJobStatus(jobId, JobStatus.UPLOADING);

      const storageKey = this.generateStorageKey(tenantId, documentType, referenceId);
      const checksum = this.computeChecksum(pdfBuffer);

      await this.storage.writeBuffer(storageKey, pdfBuffer, {
        contentType: 'application/pdf',
      });

      const storageLatencyMs = Date.now() - uploadStartTime;

      // [Step 4] Update registry
      await this.updateRegistry(
        jobId,
        tenantId,
        documentType,
        referenceId,
        storageKey,
        pdfBuffer.length,
        checksum,
        renderDurationMs,
        storageLatencyMs,
      );

      // [Step 5] Generate signed URL
      const signedUrl = await this.storage.getSignedUrl(storageKey, 3600); // 1 hour

      this.logger.log(`Job completed: ${jobId} (${renderDurationMs}ms render, ${storageLatencyMs}ms upload)`);

      return {
        documentId: ((await this.prisma.documentRegistry.findFirst({
          where: { jobId },
        })) ?? { id: '' }).id,
        storageKey,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        checksum,
        signedUrl,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      };
    } catch (error) {
      this.logger.error(`Job failed: ${jobId} - ${(error as Error).message}`);
      await this.jobTracker.failJob(jobId, (error as Error).message);
      throw error;
    }
  }

  private async checkCache(
    tenantId: string,
    documentType: string,
    referenceId?: string,
    _metadata?: Record<string, any>,
  ): Promise<any> {
    const cached = await this.jobTracker.checkCachedDocument(
      tenantId,
      documentType,
      referenceId || null,
      '1.0',
    );

    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return cached;
    }

    return null;
  }

  private async renderPdf(
    _tenantId: string,
    documentType: string,
    referenceId?: string,
    _metadata?: Record<string, any>,
  ): Promise<Buffer> {
    // Fetch document data
    const documentData = await this.fetchDocumentData(documentType, referenceId);

    // Fetch branding
    const branding = await this.fetchBranding(tenantId);

    // Create render context
    const context: RenderContext = {
      documentType,
      data: documentData,
      branding,
    };

    // Render PDF
    return this.pdfRenderer.renderPdf(context);
  }

  private async fetchDocumentData(_documentType: string, _referenceId?: string): Promise<any> {
    // This would fetch from the appropriate table based on documentType
    // For now, returning mock data
    return {
      // ... document data
    };
  }

  private async fetchBranding(_tenantId: string): Promise<any> {
    // Fetch branding configuration for tenant
    return {
      logoUrl: null,
      companyName: null,
    };
  }

  private generateStorageKey(tenantId: string, documentType: string, referenceId?: string): string {
    const templateVersion = '1.0';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (referenceId) {
      return `tenant-${tenantId}/documents/${documentType}/${referenceId}/${templateVersion}/document.pdf`;
    }

    return `tenant-${tenantId}/documents/${documentType}/${timestamp}/${templateVersion}/document.pdf`;
  }

  private computeChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async updateRegistry(
    jobId: string,
    tenantId: string,
    documentType: string,
    referenceId: string | undefined,
    storageKey: string,
    fileSize: number,
    checksum: string,
    renderDurationMs: number,
    storageLatencyMs: number | undefined,
  ): Promise<void> {
    await this.prisma.documentRegistry.updateMany({
      where: { jobId },
      data: {
        status: JobStatus.COMPLETED,
        storageKey,
        fileSizeBytes: fileSize,
        checksum,
        renderDurationMs,
        renderedAt: new Date(),
        storageLatencyMs,
        updatedAt: new Date(),
      },
    });
  }

  private createJobResult(registryRecord: any): JobResult {
    return {
      documentId: registryRecord.id,
      storageKey: registryRecord.storageKey,
      mimeType: registryRecord.mimeType,
      fileSize: Number(registryRecord.fileSizeBytes),
      checksum: registryRecord.checksum,
      signedUrl: '', // Would be generated from StorageService
      expiresAt: registryRecord.expiresAt || new Date(Date.now() + 3600000),
    };
  }
}

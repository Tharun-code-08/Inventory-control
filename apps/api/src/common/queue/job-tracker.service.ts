import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus } from './job-types';

@Injectable()
export class JobTrackerService {
  private readonly logger = new Logger(JobTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createJobRecord(
    tenantId: string,
    jobId: string,
    documentType: string,
    referenceId?: string,
  ): Promise<string> {
    const record = await this.prisma.documentRegistry.create({
      data: {
        tenantId,
        documentType,
        referenceId: referenceId || null,
        templateVersion: '1.0',
        storageKey: '',
        storageProvider: process.env.STORAGE_TYPE || 'local',
        status: JobStatus.QUEUED,
        jobId,
        mimeType: 'application/pdf',
      },
    });

    this.logger.log(`Job record created: ${record.id} (jobId: ${jobId})`);
    return record.id;
  }

  async updateJobStatus(jobId: string, status: JobStatus, progress?: number): Promise<void> {
    await this.prisma.documentRegistry.updateMany({
      where: { jobId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async completeJob(
    jobId: string,
    storageKey: string,
    fileSize: number,
    checksum: string,
  ): Promise<void> {
    await this.prisma.documentRegistry.updateMany({
      where: { jobId },
      data: {
        status: JobStatus.COMPLETED,
        storageKey,
        fileSizeBytes: fileSize,
        checksum,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await this.prisma.documentRegistry.updateMany({
      where: { jobId },
      data: {
        status: JobStatus.FAILED,
        updatedAt: new Date(),
      },
    });

    this.logger.error(`Job failed: ${jobId} - ${error}`);
  }

  async getJobRecord(jobId: string): Promise<any> {
    return this.prisma.documentRegistry.findFirst({
      where: { jobId },
    });
  }

  async checkCachedDocument(
    tenantId: string,
    documentType: string,
    referenceId: string | null,
    templateVersion: string,
  ): Promise<any> {
    return this.prisma.documentRegistry.findFirst({
      where: {
        tenantId,
        documentType,
        referenceId: referenceId || undefined,
        templateVersion,
        status: JobStatus.COMPLETED,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        generatedAt: 'desc', // Get most recent
      },
    });
  }
}

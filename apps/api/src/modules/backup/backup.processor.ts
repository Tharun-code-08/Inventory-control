import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BackupJobStatus, BackupProvider } from '@prisma/client';
import { Job } from 'bullmq';
import { JobFailureService } from '../../common/queues/job-failure.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BackupService } from './backup.service';
import { GoogleDriveService } from './google-drive.service';
import { TenantBackupService } from './tenant-backup.service';

type BackupJobPayload = { backupJobId: string };

@Processor('backups')
export class BackupProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantBackup: TenantBackupService,
    private readonly backupService: BackupService,
    private readonly googleDrive: GoogleDriveService,
    private readonly failures: JobFailureService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<BackupJobPayload>) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration.labels('backups', String(job.name), 'completed').observe(Math.max(0, durationSec));
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<BackupJobPayload>, err: Error) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration.labels('backups', String(job.name), 'failed').observe(Math.max(0, durationSec));
    await this.failures.record(job, err);
  }

  async process(job: Job<BackupJobPayload>) {
    const backupJob = await this.prisma.backupJob.findUnique({ where: { id: job.data.backupJobId } });
    if (!backupJob) throw new Error('Backup job not found');

    await this.prisma.backupJob.update({
      where: { id: backupJob.id },
      data: { status: BackupJobStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const payload = await this.tenantBackup.exportCompany(backupJob.companyId);
      const buffer = this.tenantBackup.serializeBackup(payload);
      const fileName = `tenant-${backupJob.companyId.slice(0, 8)}-${Date.now()}.json.gz`;
      let driveFileId: string | undefined;

      if (backupJob.provider === BackupProvider.GOOGLE_DRIVE) {
        const accessToken = await this.backupService.getAccessTokenForCompany(backupJob.companyId);
        const credential = await this.prisma.backupProviderCredential.findUnique({
          where: {
            companyId_provider: { companyId: backupJob.companyId, provider: BackupProvider.GOOGLE_DRIVE },
          },
        });
        if (accessToken && credential?.driveFolderId) {
          const uploaded = await this.googleDrive.uploadFile({
            accessToken,
            folderId: credential.driveFolderId,
            fileName,
            mimeType: 'application/gzip',
            buffer,
          });
          driveFileId = uploaded.id;
        }
      }

      await this.backupService.persistBackupArtifact({
        companyId: backupJob.companyId,
        backupJobId: backupJob.id,
        provider: backupJob.provider,
        buffer,
        fileName,
        driveFileId,
      });

      await this.prisma.backupJob.update({
        where: { id: backupJob.id },
        data: { status: BackupJobStatus.COMPLETED, completedAt: new Date() },
      });
      return { ok: true, fileName, driveFileId: driveFileId ?? null };
    } catch (err) {
      await this.prisma.backupJob.update({
        where: { id: backupJob.id },
        data: {
          status: BackupJobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : 'Backup failed',
        },
      });
      throw err;
    }
  }
}

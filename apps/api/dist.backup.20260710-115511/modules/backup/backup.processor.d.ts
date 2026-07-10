import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobFailureService } from '../../common/queues/job-failure.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BackupService } from './backup.service';
import { GoogleDriveService } from './google-drive.service';
import { TenantBackupService } from './tenant-backup.service';
import { MailService } from '../../common/mail/mail.service';
import { ConfigService } from '@nestjs/config';
type BackupJobPayload = {
    backupJobId: string;
};
export declare class BackupProcessor extends WorkerHost {
    private readonly prisma;
    private readonly tenantBackup;
    private readonly backupService;
    private readonly googleDrive;
    private readonly mail;
    private readonly config;
    private readonly failures;
    private readonly metrics;
    private readonly logger;
    constructor(prisma: PrismaService, tenantBackup: TenantBackupService, backupService: BackupService, googleDrive: GoogleDriveService, mail: MailService, config: ConfigService, failures: JobFailureService, metrics: MetricsService);
    onCompleted(job: Job<BackupJobPayload>): void;
    onFailed(job: Job<BackupJobPayload>, err: Error): Promise<void>;
    process(job: Job<BackupJobPayload>): Promise<{
        ok: boolean;
        fileName: string;
        driveFileId: string | null;
    }>;
}
export {};

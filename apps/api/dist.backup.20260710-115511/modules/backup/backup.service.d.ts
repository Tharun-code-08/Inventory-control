import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BackupProvider } from '@prisma/client';
import { Queue } from 'bullmq';
import type { RequestUser } from '../../common/types/request-user';
import { SubscriptionService } from '../billing/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GoogleDriveService } from './google-drive.service';
import { TenantBackupService } from './tenant-backup.service';
import { MailService } from '../../common/mail/mail.service';
export declare class BackupService {
    private readonly prisma;
    private readonly subscriptions;
    private readonly tenantBackup;
    private readonly googleDrive;
    private readonly mail;
    private readonly jwt;
    private readonly config;
    private readonly audit;
    private readonly backupQueue;
    private readonly logger;
    constructor(prisma: PrismaService, subscriptions: SubscriptionService, tenantBackup: TenantBackupService, googleDrive: GoogleDriveService, mail: MailService, jwt: JwtService, config: ConfigService, audit: AuditService, backupQueue: Queue);
    private backupDir;
    private featureEnabled;
    assertBackupAccess(user: RequestUser): Promise<string>;
    getStatus(user: RequestUser): Promise<{
        googleDriveConfigured: boolean;
        googleDriveConnected: boolean;
        googleDriveEmail: string | null;
        latestBackupAt: string | null;
        totalBackups: number;
        totalStorageBytes: string;
        emailDeliveryConfigured: boolean;
        googleDriveConfigMissing: string[];
        schemaVersion: number;
    }>;
    buildGoogleConnectUrl(user: RequestUser): {
        url: string;
    };
    completeGoogleConnect(code: string, state: string): Promise<{
        ok: boolean;
        email: string | null;
    }>;
    disconnectGoogle(user: RequestUser): Promise<{
        ok: boolean;
    }>;
    listArtifacts(user: RequestUser): Promise<{
        id: string;
        fileName: string;
        fileSize: string;
        sha256: string;
        provider: import(".prisma/client").$Enums.BackupProvider;
        schemaVersion: number;
        createdAt: string;
    }[]>;
    createBackupJob(user: RequestUser, provider?: BackupProvider): Promise<{
        jobId: string;
    }>;
    saveUploadedArtifact(user: RequestUser, file: Express.Multer.File): Promise<{
        artifactId: string;
        fileName: string;
    }>;
    getArtifactDownloadPath(user: RequestUser, artifactId: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        fileName: string;
        provider: import(".prisma/client").$Enums.BackupProvider;
        backupJobId: string | null;
        storagePath: string;
        fileSize: bigint;
        sha256: string;
        driveFileId: string | null;
        schemaVersion: number;
    }>;
    dryRunRestore(user: RequestUser, artifactId: string): Promise<{
        restoreJobId: string;
        report: import("./backup.constants").DryRunReport;
        confirmationToken: string;
    }>;
    applyRestore(user: RequestUser, restoreJobId: string, confirmationToken: string): Promise<{
        ok: boolean;
        recordsProcessed: number;
    }>;
    getAccessTokenForCompany(companyId: string): Promise<string | null>;
    persistBackupArtifact(args: {
        companyId: string;
        backupJobId: string;
        provider: BackupProvider;
        buffer: Buffer;
        fileName: string;
        driveFileId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        fileName: string;
        provider: import(".prisma/client").$Enums.BackupProvider;
        backupJobId: string | null;
        storagePath: string;
        fileSize: bigint;
        sha256: string;
        driveFileId: string | null;
        schemaVersion: number;
    }>;
    getBackupJob(user: RequestUser, jobId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.BackupJobStatus;
        provider: import(".prisma/client").$Enums.BackupProvider;
        errorMessage: string | null;
        completedAt: Date | null;
    }>;
    googleRedirectSuccessUrl(): string;
    googleRedirectErrorUrl(): string;
}

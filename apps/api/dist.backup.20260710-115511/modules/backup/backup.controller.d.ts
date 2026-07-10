import { Response } from 'express';
import type { RequestUser } from '../../common/types/request-user';
import { BackupService } from './backup.service';
export declare class BackupController {
    private readonly backup;
    constructor(backup: BackupService);
    status(user: RequestUser): Promise<{
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
    listArtifacts(user: RequestUser): Promise<{
        id: string;
        fileName: string;
        fileSize: string;
        sha256: string;
        provider: import(".prisma/client").$Enums.BackupProvider;
        schemaVersion: number;
        createdAt: string;
    }[]>;
    createJob(user: RequestUser, body: {
        provider?: 'MANUAL' | 'GOOGLE_DRIVE' | 'EMAIL';
    }): Promise<{
        jobId: string;
    }>;
    getJob(user: RequestUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.BackupJobStatus;
        provider: import(".prisma/client").$Enums.BackupProvider;
        errorMessage: string | null;
        completedAt: Date | null;
    }>;
    googleConnect(user: RequestUser): {
        url: string;
    };
    googleCallback(code: string, state: string, res: Response): Promise<void>;
    disconnectGoogle(user: RequestUser): Promise<{
        ok: boolean;
    }>;
    uploadArtifact(user: RequestUser, file: Express.Multer.File): Promise<{
        artifactId: string;
        fileName: string;
    }>;
    downloadArtifact(user: RequestUser, id: string, res: Response): Promise<Response<any, Record<string, any>>>;
    dryRun(user: RequestUser, body: {
        artifactId: string;
    }): Promise<{
        restoreJobId: string;
        report: import("./backup.constants").DryRunReport;
        confirmationToken: string;
    }>;
    apply(user: RequestUser, body: {
        restoreJobId: string;
        confirmationToken: string;
    }): Promise<{
        ok: boolean;
        recordsProcessed: number;
    }>;
}

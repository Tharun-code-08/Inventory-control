import { PrismaService } from '../../prisma/prisma.service';
import { type DryRunReport, type TenantBackupPayload } from './backup.constants';
export declare class TenantBackupService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    serializeBackup(payload: TenantBackupPayload): NonSharedBuffer;
    parseBackupBuffer(buffer: Buffer): TenantBackupPayload;
    exportCompany(companyId: string): Promise<TenantBackupPayload>;
    buildDryRunReport(payload: TenantBackupPayload, targetCompany: {
        companyCode: string;
    }): DryRunReport;
    applyTenantReplace(companyId: string, payload: TenantBackupPayload, userId: string): Promise<{
        recordsProcessed: number;
    }>;
    private applyTenantReplaceTx;
}

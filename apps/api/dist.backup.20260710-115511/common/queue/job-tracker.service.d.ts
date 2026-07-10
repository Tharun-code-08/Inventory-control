import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus } from './job-types';
export declare class JobTrackerService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createJobRecord(tenantId: string, jobId: string, documentType: string, referenceId?: string): Promise<string>;
    updateJobStatus(jobId: string, status: JobStatus, _progress?: number): Promise<void>;
    completeJob(jobId: string, storageKey: string, fileSize: number, checksum: string): Promise<void>;
    failJob(jobId: string, error: string): Promise<void>;
    getJobRecord(jobId: string): Promise<any>;
    checkCachedDocument(tenantId: string, documentType: string, referenceId: string | null, templateVersion: string): Promise<any>;
}

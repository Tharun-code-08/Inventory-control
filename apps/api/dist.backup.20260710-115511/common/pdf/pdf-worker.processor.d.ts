import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobTrackerService } from '../queue/job-tracker.service';
import { JobPayload, JobResult } from '../queue/job-types';
import { PdfRendererService } from './pdf-renderer.service';
export declare class PdfWorkerProcessor {
    private readonly prisma;
    private readonly storage;
    private readonly jobTracker;
    private readonly pdfRenderer;
    private readonly logger;
    constructor(prisma: PrismaService, storage: StorageService, jobTracker: JobTrackerService, pdfRenderer: PdfRendererService);
    processPdfJob(job: Job<JobPayload>): Promise<JobResult>;
    private checkCache;
    private renderPdf;
    private fetchDocumentData;
    private fetchBranding;
    private generateStorageKey;
    private computeChecksum;
    private updateRegistry;
    private createJobResult;
}

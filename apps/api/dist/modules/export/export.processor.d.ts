import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
type ExportJob = {
    type: 'po-pdf';
    purchaseOrderId: string;
} | {
    type: 'report-xlsx';
    reportType: string;
    filters: Record<string, unknown>;
};
export declare class ExportProcessor extends WorkerHost {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    process(job: Job<ExportJob>): Promise<{
        downloadUrl: string;
        fileName: string;
    }>;
}
export {};

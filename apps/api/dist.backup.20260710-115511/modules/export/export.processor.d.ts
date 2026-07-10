import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JobFailureService } from '../../common/queues/job-failure.service';
import { MetricsService } from '../../common/observability/metrics.service';
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
    private readonly failures;
    private readonly metrics;
    private readonly documentPdf;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, failures: JobFailureService, metrics: MetricsService, documentPdf: DocumentPdfService);
    onCompleted(job: Job<ExportJob>): void;
    onFailed(job: Job<ExportJob>, err: Error): Promise<void>;
    process(job: Job<ExportJob>): Promise<{
        downloadUrl: string;
        fileName: string;
    }>;
}
export {};

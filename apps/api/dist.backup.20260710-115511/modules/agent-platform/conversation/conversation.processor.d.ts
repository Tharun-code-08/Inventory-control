import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobFailureService } from "../../../common/queues/job-failure.service";
import { MetricsService } from "../../../common/observability/metrics.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { WhatsAppAdapter } from '../channels/whatsapp/whatsapp.adapter';
import type { WhatsAppSendJob } from './conversation.service';
export declare class ConversationProcessor extends WorkerHost {
    private readonly prisma;
    private readonly adapter;
    private readonly failures;
    private readonly metrics;
    private readonly logger;
    constructor(prisma: PrismaService, adapter: WhatsAppAdapter, failures: JobFailureService, metrics: MetricsService);
    process(job: Job<WhatsAppSendJob>): Promise<{
        sent: boolean;
        providerMessageId?: string | null;
    }>;
    onCompleted(job: Job<WhatsAppSendJob>): void;
    onFailed(job: Job<WhatsAppSendJob>, err: Error): Promise<void>;
    private markFailed;
}

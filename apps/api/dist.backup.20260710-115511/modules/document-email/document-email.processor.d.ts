import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DocumentEmailService } from './document-email.service';
type OutboxJobData = {
    outboxId: string;
};
export declare class DocumentEmailProcessor extends WorkerHost {
    private readonly documentEmail;
    private readonly logger;
    constructor(documentEmail: DocumentEmailService);
    process(job: Job<OutboxJobData>): Promise<{
        ok: boolean;
        outboxId: string;
        error?: undefined;
    } | {
        ok: boolean;
        outboxId: string;
        error: string;
    }>;
    onFailed(job: Job<OutboxJobData> | undefined, err: Error): void;
}
export {};

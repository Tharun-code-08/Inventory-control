import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { JobFailureService } from '../../common/queues/job-failure.service';
import { MetricsService } from '../../common/observability/metrics.service';
export type NotificationJob = {
    alertEventId: string;
    alertType: string;
    title: string;
    message: string;
    shopId: string | null;
    severity?: string;
};
export declare class NotificationsProcessor extends WorkerHost {
    private readonly config;
    private readonly failures;
    private readonly metrics;
    private readonly logger;
    constructor(config: ConfigService, failures: JobFailureService, metrics: MetricsService);
    onCompleted(job: Job<NotificationJob>): void;
    process(job: Job<NotificationJob>): Promise<{
        delivered: boolean;
        statusCode?: number;
    }>;
    onFailed(job: Job<NotificationJob>, err: Error): Promise<void>;
}

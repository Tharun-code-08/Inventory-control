import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueConfig } from './queue.config';
import { QueueName, JobPayload } from './job-types';
export declare class QueueService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private queues;
    private queueEvents;
    private workers;
    constructor(config: QueueConfig);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private initializeQueues;
    private closeQueues;
    private generateDeterministicJobId;
    queueJob(payload: JobPayload, forceRegenerate?: boolean): Promise<string>;
    getJobStatus(jobId: string): Promise<any>;
    getQueueMetrics(queueName: QueueName): Promise<any>;
    getAllMetrics(): Promise<any[]>;
    getQueue(queueName: QueueName): Queue;
    getAllQueues(): Map<QueueName, Queue>;
}

import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
export declare class QueueConfig {
    private readonly config;
    constructor(config: ConfigService);
    getRedisConnection(): ConnectionOptions;
    getQueueConfig(_queueName: string): {
        connection: ConnectionOptions;
        settings: {
            retryProcessDelay: number;
            stalledInterval: number;
            maxStalledCount: number;
            lockDuration: number;
            lockRenewTime: number;
        };
    };
}

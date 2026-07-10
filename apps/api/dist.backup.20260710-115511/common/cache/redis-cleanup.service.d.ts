import { OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
export declare class RedisCleanupService implements OnApplicationShutdown {
    private readonly redis;
    private readonly logger;
    constructor(redis: Redis);
    onApplicationShutdown(signal?: string): Promise<void>;
}

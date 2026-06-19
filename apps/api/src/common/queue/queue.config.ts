import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

@Injectable()
export class QueueConfig {
  constructor(private readonly config: ConfigService) {}

  getRedisConnection(): ConnectionOptions {
    return {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      db: this.config.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
    };
  }

  getQueueConfig(queueName: string) {
    return {
      connection: this.getRedisConnection(),
      settings: {
        retryProcessDelay: 5000,
        stalledInterval: 5000,
        maxStalledCount: 2,
        lockDuration: 30000,
        lockRenewTime: 15000,
      },
    };
  }
}

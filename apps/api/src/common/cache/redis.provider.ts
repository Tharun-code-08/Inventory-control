import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService): Redis => {
    return new Redis({
      host: config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(config.get<string>('REDIS_PORT', '6379')),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });
  },
  inject: [ConfigService],
};

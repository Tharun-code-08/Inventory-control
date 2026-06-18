import { Logger, OnModuleDestroy, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

let redisInstance: Redis | null = null;

export class RedisFactory implements OnModuleDestroy {
  private readonly logger = new Logger(RedisFactory.name);

  constructor(private readonly config: ConfigService) {}

  createRedisClient(): Redis {
    if (redisInstance) return redisInstance;

    redisInstance = new Redis({
      host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(this.config.get<string>('REDIS_PORT', '6379')),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });

    redisInstance.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });

    redisInstance.on('connect', () => {
      this.logger.log('Redis connected');
    });

    return redisInstance;
  }

  async onModuleDestroy() {
    if (redisInstance) {
      await redisInstance.quit();
      redisInstance = null;
    }
  }
}

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService) => new RedisFactory(config).createRedisClient(),
  inject: [ConfigService],
};

import { Injectable, Inject, Logger, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisCleanupService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisCleanupService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down Redis connection (signal: ${signal})`);
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (err) {
      this.logger.error(`Error closing Redis connection: ${err.message}`, err.stack);
    }
  }
}

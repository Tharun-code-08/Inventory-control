import { Module } from '@nestjs/common';
import { redisProvider, REDIS_CLIENT } from './redis.provider';
import { RedisCleanupService } from './redis-cleanup.service';

@Module({
  providers: [redisProvider, RedisCleanupService],
  exports: [REDIS_CLIENT],
})
export class CacheModule {}

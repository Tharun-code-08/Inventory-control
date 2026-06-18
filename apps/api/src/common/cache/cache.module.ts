import { Module } from '@nestjs/common';
import { redisProvider, REDIS_CLIENT } from './redis.provider';

@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class CacheModule {}

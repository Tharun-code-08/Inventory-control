import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

// Atomic script: increment hit counter, optionally set block key.
// KEYS[1] = hits key, KEYS[2] = block key
// ARGV[1] = window TTL ms, ARGV[2] = limit, ARGV[3] = blockDuration ms
// Returns [totalHits, hitsPttl, blockPttl]
const INCREMENT_SCRIPT = `
local blockPttl = redis.call('PTTL', KEYS[2])
if blockPttl > 0 then
  local hits = tonumber(redis.call('GET', KEYS[1])) or 0
  return {hits, 0, blockPttl}
end

local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local hitsPttl = redis.call('PTTL', KEYS[1])

if count > tonumber(ARGV[2]) then
  local blockMs = tonumber(ARGV[3])
  redis.call('SET', KEYS[2], '1', 'PX', blockMs, 'NX')
  redis.call('PEXPIRE', KEYS[1], blockMs)
  local newBlockPttl = redis.call('PTTL', KEYS[2])
  return {count, 0, newBlockPttl}
end

return {count, hitsPttl, 0}
`;

export class ThrottlerRedisStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:${throttlerName}:blocked:${key}`;
    const blockMs = blockDuration > 0 ? blockDuration : ttl;

    const result = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      hitsKey,
      blockKey,
      String(ttl),
      String(limit),
      String(blockMs),
    )) as [number, number, number];

    const totalHits = result[0];
    const hitsPttl = result[1];
    const blockPttl = result[2];
    const isBlocked = blockPttl > 0;

    return {
      totalHits,
      timeToExpire: Math.max(0, Math.ceil(hitsPttl / 1000)),
      isBlocked,
      timeToBlockExpire: Math.max(0, Math.ceil(blockPttl / 1000)),
    };
  }
}

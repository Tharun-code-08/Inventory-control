import { ThrottlerRedisStorage } from './throttler-redis.storage';

describe('ThrottlerRedisStorage', () => {
  it('fails open when Redis is unavailable instead of throwing', async () => {
    const redis = { eval: jest.fn().mockRejectedValue(new Error('Connection is closed.')) };
    const storage = new ThrottlerRedisStorage(redis as never);

    await expect(storage.increment('k', 60_000, 10, 0, 'default')).resolves.toEqual({
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('returns the script result when Redis is healthy', async () => {
    const redis = { eval: jest.fn().mockResolvedValue([3, 5000, 0]) };
    const storage = new ThrottlerRedisStorage(redis as never);

    await expect(storage.increment('k', 60_000, 10, 0, 'default')).resolves.toEqual({
      totalHits: 3,
      timeToExpire: 5,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });
});

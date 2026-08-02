import Redis from 'ioredis';

/**
 * e2e throttle isolation.
 *
 * The workflow e2e suites run `--runInBand` against ONE shared Redis, and each
 * suite creates its own Nest app but hits the API from the same loopback IP.
 * The `ThrottlerRedisStorage` counter (`throttle:<name>:<ip>`) is therefore
 * shared across every suite and accumulates within the rolling 60s window —
 * once the combined request count crosses the `global` limit (120/min), later
 * suites start getting 429 "Too Many Requests" on legitimate calls.
 *
 * Resetting only the `throttle:*` keys before each test gives every test a
 * fresh rate-limit budget without touching BullMQ (`bull:*`), dedup, or any
 * other Redis state. Individual tests fire well under both the global and auth
 * limits, so this fully removes the cross-suite contamination.
 *
 * Registered via `setupFilesAfterEnv` in test/jest-e2e.json.
 */

const host = process.env.REDIS_HOST ?? '127.0.0.1';
const port = Number(process.env.REDIS_PORT ?? '6379');

// One lazy connection per test file; opened on first use, closed in afterAll.
let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      host,
      port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      // Never let a throttle-reset failure hang or crash the suite.
      retryStrategy: () => null,
    });
    client.on('error', () => {
      /* swallowed — reset is best-effort */
    });
  }
  return client;
}

async function flushThrottleKeys(): Promise<void> {
  const redis = getClient();
  try {
    const keys = await redis.keys('throttle:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable / connection refused: nothing to reset, keep going.
  }
}

beforeEach(async () => {
  await flushThrottleKeys();
});

afterAll(async () => {
  if (client) {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
    client = null;
  }
});

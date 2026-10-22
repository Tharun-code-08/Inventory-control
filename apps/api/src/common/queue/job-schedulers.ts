import type { Queue } from 'bullmq';

/**
 * Remove every job scheduler on `queue` except `keepIds`. bullmq 5 stored
 * `queue.add(..., { repeat })` schedules under generated keys; after the move
 * to upsertJobScheduler (bullmq 6) those would keep firing next to the new
 * ones, so each scheduler module prunes its queue before upserting.
 */
export async function removeStaleJobSchedulers(queue: Queue, keepIds: readonly string[]): Promise<void> {
  const keep = new Set(keepIds);
  for (const scheduler of await queue.getJobSchedulers()) {
    if (!keep.has(scheduler.key)) await queue.removeJobScheduler(scheduler.key);
  }
}

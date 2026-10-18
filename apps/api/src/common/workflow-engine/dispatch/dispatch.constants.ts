/** BullMQ queue that performs deferred and batched customer sends (Plan §11). */
export const NOTIFICATION_DISPATCH_QUEUE = 'notification-dispatch';

/** Job names on the dispatch queue. */
export const DISPATCH_JOB = {
  /** A single send whose quiet-hours window has now opened. */
  DEFERRED_SEND: 'deferred-send',
  /** Flush a customer's accumulated low-priority sends as one digest. */
  FLUSH_BATCH: 'flush-batch',
} as const;

/** How long low-priority sends accumulate before a digest is flushed (ms). */
export const BATCH_WINDOW_MS = 60 * 60 * 1000; // 1h

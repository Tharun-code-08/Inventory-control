/**
 * Dead / stalled workflow detection (Plan §10 "Dead Workflow Recovery") — pure.
 *
 * A running (ACTIVE) followup thread whose next action is far past due has
 * stalled — a worker crashed mid-step, a queue job was lost, or a resume was
 * missed. This classifies how overdue a thread is so the recovery scheduler can
 * retry it (re-arm) or escalate it. Terminal/paused threads are never touched.
 */
export type StallVerdict = 'healthy' | 'retry' | 'escalate';

export interface ThreadHealthInput {
  readonly state: string;
  readonly nextActionAt: Date | null;
  readonly updatedAt: Date;
}

export interface StallThresholds {
  /** Overdue beyond this ⇒ retry the thread. */
  readonly retryAfterMs: number;
  /** Overdue beyond this ⇒ escalate (retries exhausted / far gone). */
  readonly escalateAfterMs: number;
}

export const DEFAULT_STALL_THRESHOLDS: StallThresholds = {
  retryAfterMs: 60 * 60 * 1000, // 1h past due
  escalateAfterMs: 24 * 60 * 60 * 1000, // 24h past due
};

export function classifyStalled(
  thread: ThreadHealthInput,
  now: Date,
  thresholds: StallThresholds = DEFAULT_STALL_THRESHOLDS,
): StallVerdict {
  if (thread.state !== 'ACTIVE') return 'healthy';
  const due = thread.nextActionAt ?? thread.updatedAt;
  const overdueMs = now.getTime() - due.getTime();
  if (overdueMs > thresholds.escalateAfterMs) return 'escalate';
  if (overdueMs > thresholds.retryAfterMs) return 'retry';
  return 'healthy';
}

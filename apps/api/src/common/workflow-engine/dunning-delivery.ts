/**
 * Dunning consumer core (Phase 2, consumer side) — pure logic.
 *
 * When the engine consumes an `invoice.dunning-step` event it must (a) work out
 * the ordered channel attempts (fallback), and (b) on `invoice.paid` /
 * `customer.replied`, transition the thread. Both are pure here; the
 * (staging-gated) consumer executes the sends and persists the transition.
 */
import {
  DunningAudience,
  DunningChannel,
  DunningPriority,
  DunningTone,
  DUNNING_LADDER,
} from './dunning';
import { ThreadState } from './dunning-sweep';

export interface DunningStepEventPayload {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly customerId: string;
  readonly stepIndex: number;
  readonly tone: DunningTone;
  readonly audience: DunningAudience;
  readonly daysFromDue: number;
  readonly balanceDue: number;
  readonly channels: readonly DunningChannel[];
}

export interface DeliveryAttempt {
  readonly channel: DunningChannel;
  /** 0-based position in the fallback order. */
  readonly order: number;
}

export interface DunningDeliveryPlan {
  /** Ordered fallback attempts: try order 0; on failure advance to the next. */
  readonly attempts: DeliveryAttempt[];
  readonly audience: DunningAudience;
  readonly tone: DunningTone;
  readonly priority: DunningPriority;
}

/**
 * Turn a dunning-step event into an ordered set of delivery attempts. The
 * adapter executes `attempts` in order and stops at the first success; a failed
 * attempt hands off to {@link nextFallback}.
 */
export function planDunningDelivery(payload: DunningStepEventPayload): DunningDeliveryPlan {
  const step = DUNNING_LADDER[payload.stepIndex];
  return {
    attempts: payload.channels.map((channel, order) => ({ channel, order })),
    audience: payload.audience,
    tone: payload.tone,
    priority: step?.priority ?? 'NORMAL',
  };
}

/** The next attempt to try after `failedOrder` failed, or null when exhausted. */
export function nextFallback(
  attempts: readonly DeliveryAttempt[],
  failedOrder: number,
): DeliveryAttempt | null {
  return attempts.find((a) => a.order === failedOrder + 1) ?? null;
}

export type DunningLifecycleEvent = 'invoice.paid' | 'customer.replied';

export interface ThreadTransition {
  readonly state: ThreadState;
  readonly stopReason: string;
}

/**
 * Fold a lifecycle event onto a thread's current state. Returns null when the
 * event is a no-op for that state (idempotent — a paid invoice stays resolved,
 * a non-active thread ignores a reply).
 */
export function reduceThreadOnLifecycle(
  eventType: DunningLifecycleEvent,
  current: ThreadState,
): ThreadTransition | null {
  if (eventType === 'invoice.paid') {
    if (current === 'RESOLVED') return null;
    return { state: 'RESOLVED', stopReason: 'Invoice settled (stop-on-payment).' };
  }
  // customer.replied — only an actively-dunning thread pauses for a human.
  if (current === 'ACTIVE' || current === 'ESCALATED') {
    return { state: 'PAUSED', stopReason: 'Customer replied (stop-on-reply).' };
  }
  return null;
}

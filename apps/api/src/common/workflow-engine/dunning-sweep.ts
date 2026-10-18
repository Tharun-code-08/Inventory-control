/**
 * Dunning sweep planner (Phase 2, producer side) — pure logic.
 *
 * A scheduled sweep asks one question: "which unpaid invoices need a follow-up
 * right now?". This module answers it with NO I/O. The (staging-gated) service
 * feeds in plain candidate records (invoice + thread + consent snapshots) and
 * gets back a plan: which `invoice.dunning-step` events to emit, how to advance
 * each FollowupThread, and what was blocked/skipped. The service then persists
 * threads and emits events — it never re-decides.
 *
 * Prioritisation (plan algorithm §8): higher-value, higher-risk accounts first.
 */
import {
  CustomerConsent,
  DunningChannel,
  DunningStep,
  InvoiceCollectStatus,
  computeNextAction,
  DUNNING_LADDER,
} from './dunning';

const DAY_MS = 86_400_000;

export type ThreadState =
  | 'ACTIVE'
  | 'PAUSED'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'STOPPED'
  | 'WAITING_APPROVAL';

/** Thread states the sweep leaves untouched (waiting on a human/approval/closed). */
const TERMINAL_OR_HELD: ReadonlySet<ThreadState> = new Set<ThreadState>([
  'PAUSED',
  'RESOLVED',
  'STOPPED',
  'WAITING_APPROVAL',
]);

export interface ThreadSnapshot {
  readonly ladderStep: number;
  readonly state: ThreadState;
}

export interface DunningCandidate {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly dueDate: Date | null;
  readonly balanceDue: number;
  readonly invoiceStatus: InvoiceCollectStatus;
  readonly customerReplied: boolean;
  readonly consent: CustomerConsent;
  /** Existing FollowupThread snapshot, or null if none yet. */
  readonly thread: ThreadSnapshot | null;
  /** Numeric tier weight (e.g. VIP=1, normal=0). Default 0. */
  readonly customerTier?: number;
  /** Failed prior reminders on this invoice. Default 0. */
  readonly priorReminderFailures?: number;
}

export interface PlannedSend {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly step: DunningStep;
  readonly channels: DunningChannel[];
  readonly daysFromDue: number;
  readonly balanceDue: number;
  readonly score: number;
}

export interface ThreadOp {
  readonly invoiceId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly ladderStep: number;
  readonly state: ThreadState;
  readonly nextActionAt: Date | null;
  readonly stopReason?: string;
}

export interface BlockedInfo {
  readonly invoiceId: string;
  readonly stepIndex: number;
  readonly reason: string;
}

export interface SkippedInfo {
  readonly invoiceId: string;
  readonly reason: string;
}

export interface DunningSweepPlan {
  /** Sends to emit as `invoice.dunning-step`, highest priority first, capped. */
  readonly sends: PlannedSend[];
  readonly threadOps: ThreadOp[];
  readonly blocked: BlockedInfo[];
  readonly skipped: SkippedInfo[];
}

export interface SweepOptions {
  /** Max sends to emit per sweep (respect provider throughput). Default 200. */
  readonly batchLimit?: number;
}

export function daysFromDue(now: Date, dueDate: Date): number {
  return Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS);
}

const offsetDate = (dueDate: Date, dayOffset: number): Date =>
  new Date(dueDate.getTime() + dayOffset * DAY_MS);

/** When does the step *after* `index` become due? null if `index` is the last. */
const nextActionAtFor = (dueDate: Date, index: number): Date | null => {
  const next = DUNNING_LADDER[index + 1];
  return next ? offsetDate(dueDate, next.dayOffset) : null;
};

/**
 * Priority score (plan §8). Amount dominates by design — chase the biggest,
 * most-overdue exposure first — with tier and prior-failure nudges.
 */
export function dunningPriorityScore(input: {
  balanceDue: number;
  daysFromDue: number;
  customerTier?: number;
  priorReminderFailures?: number;
}): number {
  return (
    input.balanceDue * 0.4 +
    Math.max(input.daysFromDue, 0) * 0.3 +
    (input.customerTier ?? 0) * 0.2 +
    (input.priorReminderFailures ?? 0) * 0.1
  );
}

/** Build the `invoice.dunning-step` event payload for a planned send. */
export function toDunningStepEvent(send: PlannedSend): Record<string, unknown> {
  return {
    invoiceId: send.invoiceId,
    invoiceNumber: send.invoiceNumber,
    customerId: send.customerId,
    stepIndex: send.step.index,
    tone: send.step.tone,
    audience: send.step.audience,
    daysFromDue: send.daysFromDue,
    balanceDue: send.balanceDue,
    channels: send.channels,
  };
}

/** Plan a whole sweep over the candidate set. Pure — no persistence, no emits. */
export function planDunningSweep(
  candidates: readonly DunningCandidate[],
  now: Date,
  options: SweepOptions = {},
): DunningSweepPlan {
  const sends: PlannedSend[] = [];
  const threadOps: ThreadOp[] = [];
  const blocked: BlockedInfo[] = [];
  const skipped: SkippedInfo[] = [];

  for (const c of candidates) {
    if (!c.dueDate) {
      skipped.push({ invoiceId: c.invoiceId, reason: 'No due date to schedule against.' });
      continue;
    }
    if (c.thread && TERMINAL_OR_HELD.has(c.thread.state)) {
      skipped.push({ invoiceId: c.invoiceId, reason: `Thread ${c.thread.state}.` });
      continue;
    }

    const days = daysFromDue(now, c.dueDate);
    const lastCompletedStep = c.thread?.ladderStep ?? -1;
    const decision = computeNextAction({
      daysFromDue: days,
      balanceDue: c.balanceDue,
      invoiceStatus: c.invoiceStatus,
      customerReplied: c.customerReplied,
      lastCompletedStep,
      consent: c.consent,
    });

    const opBase = { invoiceId: c.invoiceId, companyId: c.companyId, customerId: c.customerId };

    switch (decision.kind) {
      case 'SEND': {
        const step = decision.step!;
        sends.push({
          ...opBase,
          invoiceNumber: c.invoiceNumber,
          step,
          channels: decision.channels ?? [],
          daysFromDue: days,
          balanceDue: c.balanceDue,
          score: dunningPriorityScore({
            balanceDue: c.balanceDue,
            daysFromDue: days,
            customerTier: c.customerTier,
            priorReminderFailures: c.priorReminderFailures,
          }),
        });
        threadOps.push({
          ...opBase,
          ladderStep: step.index,
          state: step.audience === 'staff' ? 'ESCALATED' : 'ACTIVE',
          nextActionAt: nextActionAtFor(c.dueDate, step.index),
        });
        break;
      }
      case 'WAIT': {
        threadOps.push({
          ...opBase,
          ladderStep: lastCompletedStep,
          state: 'ACTIVE',
          nextActionAt:
            decision.waitUntilOffset !== undefined
              ? offsetDate(c.dueDate, decision.waitUntilOffset)
              : null,
        });
        break;
      }
      case 'STOP': {
        const resolved = c.invoiceStatus === 'PAID' || c.balanceDue <= 0;
        threadOps.push({
          ...opBase,
          ladderStep: lastCompletedStep,
          state: resolved ? 'RESOLVED' : 'STOPPED',
          nextActionAt: null,
          stopReason: decision.reason,
        });
        break;
      }
      case 'PAUSE': {
        threadOps.push({
          ...opBase,
          ladderStep: lastCompletedStep,
          state: 'PAUSED',
          nextActionAt: null,
          stopReason: decision.reason,
        });
        break;
      }
      case 'BLOCKED_NO_CONSENT': {
        blocked.push({
          invoiceId: c.invoiceId,
          stepIndex: decision.step!.index,
          reason: decision.reason,
        });
        break;
      }
      case 'EXHAUSTED': {
        threadOps.push({
          ...opBase,
          ladderStep: lastCompletedStep,
          state: 'ESCALATED',
          nextActionAt: null,
          stopReason: decision.reason,
        });
        break;
      }
    }
  }

  const batchLimit = options.batchLimit ?? 200;
  sends.sort((a, b) => b.score - a.score);

  return { sends: sends.slice(0, batchLimit), threadOps, blocked, skipped };
}

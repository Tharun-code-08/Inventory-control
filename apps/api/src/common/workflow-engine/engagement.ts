/**
 * Engagement / reliability scoring core (Phase 3 §9) — pure logic.
 *
 * Folds delivery-ledger + webhook signals (opens, clicks, replies, payments,
 * ignores, blocks) onto a per-customer counter snapshot, then derives a
 * reliability score, preferred channel and preferred send hour. These feed
 * channel selection and cadence (and the AI advisor's memory). The score is
 * *recomputed* from counters (order-independent) rather than accumulated, so a
 * replay or backfill can never drift it.
 */

export type EngagementSignal =
  | 'OPENED'
  | 'CLICKED'
  | 'REPLIED'
  | 'PAID'
  | 'IGNORED'
  | 'BLOCKED';

export type EngagementChannel = 'WHATSAPP' | 'EMAIL';

export interface EngagementSnapshot {
  readonly opens: number;
  readonly clicks: number;
  readonly replies: number;
  readonly paidCount: number;
  readonly ignored: number;
  readonly blocked: number;
  /** Positive-signal tallies per channel, for preferredChannel. */
  readonly whatsappSignals: number;
  readonly emailSignals: number;
}

export const EMPTY_ENGAGEMENT: EngagementSnapshot = {
  opens: 0,
  clicks: 0,
  replies: 0,
  paidCount: 0,
  ignored: 0,
  blocked: 0,
  whatsappSignals: 0,
  emailSignals: 0,
};

const POSITIVE: ReadonlySet<EngagementSignal> = new Set<EngagementSignal>([
  'OPENED',
  'CLICKED',
  'REPLIED',
  'PAID',
]);

/** Counter weights for the reliability score, around a neutral base of 50. */
const WEIGHTS = {
  opens: 5,
  clicks: 10,
  replies: 8,
  paid: 30,
  ignored: -5,
  blocked: -100,
} as const;

const SCORE_BASE = 50;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Fold one signal onto the snapshot, returning a new snapshot (immutable). */
export function applyEngagementSignal(
  snapshot: EngagementSnapshot,
  signal: EngagementSignal,
  channel?: EngagementChannel,
): EngagementSnapshot {
  const next: EngagementSnapshot = {
    ...snapshot,
    opens: snapshot.opens + (signal === 'OPENED' ? 1 : 0),
    clicks: snapshot.clicks + (signal === 'CLICKED' ? 1 : 0),
    replies: snapshot.replies + (signal === 'REPLIED' ? 1 : 0),
    paidCount: snapshot.paidCount + (signal === 'PAID' ? 1 : 0),
    ignored: snapshot.ignored + (signal === 'IGNORED' ? 1 : 0),
    blocked: snapshot.blocked + (signal === 'BLOCKED' ? 1 : 0),
    whatsappSignals:
      snapshot.whatsappSignals + (POSITIVE.has(signal) && channel === 'WHATSAPP' ? 1 : 0),
    emailSignals: snapshot.emailSignals + (POSITIVE.has(signal) && channel === 'EMAIL' ? 1 : 0),
  };
  return next;
}

/** Reliability score in [0, 100], recomputed from counters. */
export function computeReliabilityScore(s: EngagementSnapshot): number {
  const raw =
    SCORE_BASE +
    s.opens * WEIGHTS.opens +
    s.clicks * WEIGHTS.clicks +
    s.replies * WEIGHTS.replies +
    s.paidCount * WEIGHTS.paid +
    s.ignored * WEIGHTS.ignored +
    s.blocked * WEIGHTS.blocked;
  return clamp(Math.round(raw), 0, 100);
}

/** The channel the customer engages with most, or null when tied/unknown. */
export function preferredChannel(s: EngagementSnapshot): EngagementChannel | null {
  if (s.whatsappSignals === s.emailSignals) return null;
  return s.whatsappSignals > s.emailSignals ? 'WHATSAPP' : 'EMAIL';
}

/**
 * The modal hour (0–23) at which the customer engages, from observed engagement
 * hours; null when there is no data. Ties resolve to the earliest hour.
 */
export function preferredSendHour(engagementHours: readonly number[]): number | null {
  if (engagementHours.length === 0) return null;
  const tally = new Map<number, number>();
  for (const h of engagementHours) tally.set(h, (tally.get(h) ?? 0) + 1);
  let bestHour = -1;
  let bestCount = -1;
  for (const [hour, count] of tally) {
    if (count > bestCount || (count === bestCount && hour < bestHour)) {
      bestHour = hour;
      bestCount = count;
    }
  }
  return bestHour;
}

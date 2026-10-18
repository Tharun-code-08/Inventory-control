/**
 * Predictive models (Plan Phase 6) — pure, deterministic heuristics. These give
 * explainable estimates today and are the pluggable seam where a trained model
 * can be swapped in behind the same functions later (like the AI advisor, they
 * never bypass business rules — outputs are advisory inputs to the pipeline).
 */
export interface AccountFacts {
  /** 0..100 cached engagement reliability. */
  readonly reliability: number;
  readonly daysOverdue: number;
  readonly balanceDue: number;
  /** Count of prior on-time/late settled invoices for this customer. */
  readonly priorPaid?: number;
  readonly priorDisputed?: number;
  /** Fraction of prior messages ignored, 0..1. */
  readonly ignoredRate?: number;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Probability the invoice is paid without escalation, 0..1. Reliability lifts it;
 * being further overdue and past-disputes pull it down.
 */
export function paymentLikelihood(f: AccountFacts): number {
  const base = f.reliability / 100; // 0..1
  const overduePenalty = Math.min(0.4, Math.max(0, f.daysOverdue) * 0.015);
  const disputePenalty = Math.min(0.3, (f.priorDisputed ?? 0) * 0.1);
  const historyBonus = Math.min(0.2, (f.priorPaid ?? 0) * 0.03);
  return round2(clamp01(base - overduePenalty - disputePenalty + historyBonus));
}

/** Churn risk 0..1 — how likely the customer disengages/leaves. */
export function churnRisk(f: AccountFacts): number {
  const ignore = f.ignoredRate ?? 0;
  const disengagement = 1 - f.reliability / 100;
  const disputes = Math.min(0.4, (f.priorDisputed ?? 0) * 0.12);
  return round2(clamp01(0.5 * disengagement + 0.35 * ignore + disputes));
}

/** Expected recoverable amount from a set of open balances. */
export function collectionForecast(
  accounts: readonly { balanceDue: number; likelihood: number }[],
): { expectedRecovery: number; totalOutstanding: number; recoveryRate: number } {
  let expected = 0;
  let total = 0;
  for (const a of accounts) {
    expected += a.balanceDue * a.likelihood;
    total += a.balanceDue;
  }
  return {
    expectedRecovery: Math.round(expected),
    totalOutstanding: Math.round(total),
    recoveryRate: total > 0 ? round2(expected / total) : 0,
  };
}

export type NextBestAction =
  | 'send-friendly-reminder'
  | 'send-firm-reminder'
  | 'offer-payment-plan'
  | 'escalate-to-manager'
  | 'review-for-writeoff';

/** Recommend the next collection action from likelihood + how overdue it is. */
export function nextBestAction(f: AccountFacts): { action: NextBestAction; rationale: string } {
  const likelihood = paymentLikelihood(f);
  if (f.daysOverdue <= 0) return { action: 'send-friendly-reminder', rationale: 'not yet overdue' };
  if (likelihood >= 0.6) return { action: 'send-firm-reminder', rationale: `likely to pay (${likelihood})` };
  if (likelihood >= 0.35 && f.balanceDue >= 50_000) {
    return { action: 'offer-payment-plan', rationale: 'high value, moderate likelihood' };
  }
  if (f.daysOverdue > 21 || (likelihood < 0.2 && f.balanceDue >= 100_000)) {
    return { action: 'escalate-to-manager', rationale: `${f.daysOverdue}d overdue, low likelihood (${likelihood})` };
  }
  if (likelihood < 0.15 && f.daysOverdue > 45) {
    return { action: 'review-for-writeoff', rationale: 'very low likelihood, long overdue' };
  }
  return { action: 'send-firm-reminder', rationale: 'default follow-up' };
}

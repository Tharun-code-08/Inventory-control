/**
 * Deterministic dunning core (Phase 2) — pure, DB-free, exhaustively testable.
 *
 * This is the heart of customer follow-up: given an invoice's state and the
 * thread's progress, it decides the single next action (send which step on
 * which channels, wait, pause, stop, or escalate). It performs NO I/O — the
 * FollowupThread persistence, WhatsApp/email sends and consent lookups live in
 * the (staging-gated) service layer that calls into this module.
 *
 * The AI layer may only *recommend* within these bounds; this function is the
 * authority that guarantees stop-on-payment, stop-on-reply and consent.
 */

export type DunningTone = 'friendly' | 'reminder' | 'firm' | 'final' | 'escalation';
export type DunningAudience = 'customer' | 'staff';
export type DunningChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP';
export type DunningPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface DunningStep {
  readonly index: number;
  readonly label: string;
  readonly tone: DunningTone;
  /** Days relative to the invoice due date; negative = before due. */
  readonly dayOffset: number;
  readonly audience: DunningAudience;
  readonly priority: DunningPriority;
  /** Preferred channel order; fallback walks this list left→right. */
  readonly channelOrder: readonly DunningChannel[];
}

/**
 * Default, code-owned customer-first ladder. Intensity rises; frequency does
 * not. Steps 0–3 target the customer; 4–5 escalate internally to staff. Per-
 * company overrides (WorkflowGraph/NotificationPolicy) layer on later without
 * changing this contract.
 */
export const DUNNING_LADDER: readonly DunningStep[] = [
  { index: 0, label: 'Friendly reminder', tone: 'friendly', dayOffset: -3, audience: 'customer', priority: 'NORMAL', channelOrder: ['WHATSAPP', 'EMAIL'] },
  { index: 1, label: 'Payment due', tone: 'reminder', dayOffset: 0, audience: 'customer', priority: 'NORMAL', channelOrder: ['WHATSAPP', 'EMAIL'] },
  { index: 2, label: 'Firm reminder', tone: 'firm', dayOffset: 3, audience: 'customer', priority: 'HIGH', channelOrder: ['WHATSAPP', 'EMAIL'] },
  { index: 3, label: 'Final notice', tone: 'final', dayOffset: 7, audience: 'customer', priority: 'HIGH', channelOrder: ['EMAIL', 'WHATSAPP'] },
  { index: 4, label: 'Escalate to manager', tone: 'escalation', dayOffset: 14, audience: 'staff', priority: 'HIGH', channelOrder: ['IN_APP'] },
  { index: 5, label: 'Credit hold review', tone: 'escalation', dayOffset: 21, audience: 'staff', priority: 'CRITICAL', channelOrder: ['IN_APP'] },
];

export interface CustomerConsent {
  readonly whatsapp: boolean;
  readonly email: boolean;
}

export type InvoiceCollectStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';

export interface DunningInput {
  /** today − dueDate in whole days; negative before due, positive when overdue. */
  readonly daysFromDue: number;
  readonly balanceDue: number;
  readonly invoiceStatus: InvoiceCollectStatus;
  /** The customer replied on any channel → pause and let a human take over. */
  readonly customerReplied: boolean;
  /** Highest ladder index already completed for this invoice; -1 if none. */
  readonly lastCompletedStep: number;
  readonly consent: CustomerConsent;
}

export type DunningDecisionKind =
  | 'STOP'
  | 'PAUSE'
  | 'WAIT'
  | 'SEND'
  | 'BLOCKED_NO_CONSENT'
  | 'EXHAUSTED';

export interface DunningDecision {
  readonly kind: DunningDecisionKind;
  readonly reason: string;
  readonly step?: DunningStep;
  /** Resolved fallback order for a SEND (consent-filtered for customer steps). */
  readonly channels?: DunningChannel[];
  /** For WAIT: the dayOffset the next step becomes due. */
  readonly waitUntilOffset?: number;
}

/** Consent-filter a customer step's channel order (IN_APP is staff-only, never gated). */
export function resolveConsentedChannels(
  order: readonly DunningChannel[],
  consent: CustomerConsent,
): DunningChannel[] {
  return order.filter((c) => {
    if (c === 'WHATSAPP') return consent.whatsapp;
    if (c === 'EMAIL') return consent.email;
    return false; // IN_APP is not a customer channel
  });
}

/**
 * The single authority for "what happens next" on a dunning thread. Stop and
 * pause conditions are checked before any step advances, so payment or a reply
 * always wins over the schedule.
 */
export function computeNextAction(input: DunningInput): DunningDecision {
  const { balanceDue, invoiceStatus, customerReplied, lastCompletedStep, daysFromDue, consent } =
    input;

  // Stop-on-payment — the overriding invariant.
  if (invoiceStatus === 'PAID' || balanceDue <= 0) {
    return { kind: 'STOP', reason: 'Invoice is settled.' };
  }
  if (invoiceStatus === 'VOID' || invoiceStatus === 'DRAFT') {
    return { kind: 'STOP', reason: 'Invoice is not collectible in its current status.' };
  }
  // Stop-on-reply — hand off to a human.
  if (customerReplied) {
    return { kind: 'PAUSE', reason: 'Customer replied; paused for human follow-up.' };
  }

  const nextIndex = lastCompletedStep + 1;
  if (nextIndex >= DUNNING_LADDER.length) {
    return { kind: 'EXHAUSTED', reason: 'Dunning ladder exhausted.' };
  }

  const step = DUNNING_LADDER[nextIndex];
  if (daysFromDue < step.dayOffset) {
    return {
      kind: 'WAIT',
      reason: `Next step "${step.label}" is due at day ${step.dayOffset}.`,
      step,
      waitUntilOffset: step.dayOffset,
    };
  }

  if (step.audience === 'staff') {
    // Internal escalation — no consent needed, always in-app to the team.
    return {
      kind: 'SEND',
      reason: `Escalation step "${step.label}".`,
      step,
      channels: [...step.channelOrder],
    };
  }

  const channels = resolveConsentedChannels(step.channelOrder, consent);
  if (channels.length === 0) {
    return {
      kind: 'BLOCKED_NO_CONSENT',
      reason: `No consented channel for customer step "${step.label}".`,
      step,
    };
  }
  return {
    kind: 'SEND',
    reason: `Customer reminder "${step.label}".`,
    step,
    channels,
  };
}

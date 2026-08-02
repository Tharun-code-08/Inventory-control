/**
 * Pure mappers that turn a dunning-step event + engagement into the inputs the
 * policy engine and channel router consume (Plan §7, §8). Kept pure so the
 * "why this channel/priority" decision is reproducible and unit-tested; the
 * dispatch service does the I/O around them.
 */
import { PolicyFacts } from '../policy/policy-types';
import { SendPriority } from '../send-window';
import { DunningStepEventPayload } from '../dunning-delivery';
import { DUNNING_LADDER } from '../dunning';

/** Ladder priority (LOW|NORMAL|HIGH|CRITICAL) → send-window SendPriority. */
export function stepPriority(payload: DunningStepEventPayload): SendPriority {
  const ladderPriority = DUNNING_LADDER[payload.stepIndex]?.priority ?? 'NORMAL';
  switch (ladderPriority) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'LOW':
      return 'LOW';
    default:
      return 'NORMAL';
  }
}

/**
 * Build the flat fact set a NotificationPolicy is evaluated against. `reliability`
 * is the customer's cached engagement score (0..100); higher = more dependable.
 */
export function toPolicyFacts(
  payload: DunningStepEventPayload,
  opts: { readonly reliability?: number; readonly customerTier?: string } = {},
): PolicyFacts {
  return {
    amount: payload.balanceDue,
    daysOverdue: payload.daysFromDue,
    tone: payload.tone,
    stepIndex: payload.stepIndex,
    audience: payload.audience,
    reliability: opts.reliability,
    customerTier: opts.customerTier,
  };
}

/** Is this ladder step aimed at the customer (vs an internal staff escalation)? */
export function isCustomerStep(payload: DunningStepEventPayload): boolean {
  return payload.audience === 'customer';
}

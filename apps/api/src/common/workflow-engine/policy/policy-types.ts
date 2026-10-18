/**
 * Policy engine types (Plan §7). A policy is a tenant-owned `condition -> action`
 * rule evaluated against a fact set. Policies are data (NotificationPolicy rows),
 * never hard-coded branches, so different tenants get different behaviour without
 * touching the engine:
 *
 *   Amount > ₹1,00,000  ->  escalate after 1 day
 *   Amount > ₹10,000    ->  escalate after 5 days
 */

/** The flat fact set a policy is evaluated against. */
export interface PolicyFacts {
  readonly amount?: number;
  readonly daysOverdue?: number;
  readonly customerTier?: string; // VIP | STANDARD | NEW …
  readonly reliability?: number; // 0..100
  readonly [key: string]: unknown;
}

export type Comparator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

/** A leaf comparison against one fact. */
export interface Predicate {
  readonly fact: string;
  readonly op: Comparator;
  readonly value: unknown;
}

/** A boolean tree of predicates. */
export type PolicyCondition =
  | { readonly all: readonly PolicyCondition[] }
  | { readonly any: readonly PolicyCondition[] }
  | { readonly not: PolicyCondition }
  | Predicate;

/** What a matching policy asserts. Merged into the pipeline decision. */
export interface PolicyAction {
  /** Escalate to a role/queue after this many hours overdue. */
  readonly escalateAfterHours?: number;
  /** Force a channel or channel order. */
  readonly channel?: string;
  /** Override priority (LOW|NORMAL|HIGH|CRITICAL). */
  readonly priority?: string;
  /** Cap sends per recipient per day. */
  readonly maxPerDay?: number;
  /** Suppress entirely (e.g. compliance hold). */
  readonly suppress?: boolean;
  readonly [key: string]: unknown;
}

export interface PolicyRule {
  readonly id: string;
  readonly name: string;
  readonly priority: number; // lower runs first
  readonly condition: PolicyCondition;
  readonly action: PolicyAction;
}

/** The resolved effect after evaluating all matching policies in priority order. */
export interface PolicyDecision {
  readonly action: PolicyAction;
  readonly matched: readonly string[]; // matched policy ids, in applied order
}

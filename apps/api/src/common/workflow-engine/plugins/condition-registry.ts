import { Injectable } from '@nestjs/common';
import { ConditionSpec } from '../graph/graph-types';

/**
 * Pluggable Condition registry (Plan §5). A Condition answers a yes/no about the
 * current facts; CONDITION nodes reference one by `type`. New conditions register
 * here without touching the engine — the open/closed principle in practice.
 */
export interface ConditionFacts {
  readonly invoicePaid: boolean;
  readonly customerReplied: boolean;
  readonly now: Date;
  readonly amount?: number;
  readonly daysOverdue?: number;
  /** Arbitrary named booleans (e.g. approvalReceived). */
  readonly flags?: Readonly<Record<string, boolean>>;
}

export interface WorkflowCondition {
  readonly type: string;
  evaluate(facts: ConditionFacts, params?: Readonly<Record<string, unknown>>): boolean;
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** The code-owned default conditions (Plan §5 examples). */
export const BUILTIN_CONDITIONS: readonly WorkflowCondition[] = [
  { type: 'invoice.paid', evaluate: (f) => f.invoicePaid },
  { type: 'customer.replied', evaluate: (f) => f.customerReplied },
  {
    type: 'amount.gt',
    evaluate: (f, p) => f.amount != null && num(p?.value) != null && f.amount > (num(p?.value) as number),
  },
  {
    type: 'amount.gte',
    evaluate: (f, p) => f.amount != null && num(p?.value) != null && f.amount >= (num(p?.value) as number),
  },
  {
    type: 'daysOverdue.gte',
    evaluate: (f, p) => f.daysOverdue != null && num(p?.value) != null && f.daysOverdue >= (num(p?.value) as number),
  },
  { type: 'officeHours', evaluate: (f) => f.now.getUTCHours() >= 3 && f.now.getUTCHours() < 13 }, // ~09:00–19:00 IST
  { type: 'weekend', evaluate: (f) => f.now.getUTCDay() === 0 || f.now.getUTCDay() === 6 },
  { type: 'approvalReceived', evaluate: (f) => f.flags?.approvalReceived ?? false },
];

@Injectable()
export class ConditionRegistry {
  private readonly conditions = new Map<string, WorkflowCondition>();

  constructor() {
    for (const c of BUILTIN_CONDITIONS) this.register(c);
  }

  register(condition: WorkflowCondition): void {
    this.conditions.set(condition.type, condition);
  }

  has(type: string): boolean {
    return this.conditions.has(type);
  }

  /** Evaluate a spec; an unregistered condition is treated as false (fail-safe). */
  evaluate(spec: ConditionSpec, facts: ConditionFacts): boolean {
    const condition = this.conditions.get(spec.type);
    return condition ? condition.evaluate(facts, spec.params) : false;
  }
}

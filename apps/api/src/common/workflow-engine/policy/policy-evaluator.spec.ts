import { evaluateCondition, evaluatePolicies } from './policy-evaluator';
import { PolicyRule } from './policy-types';

describe('evaluateCondition', () => {
  it('evaluates leaf predicates by comparator', () => {
    expect(evaluateCondition({ fact: 'amount', op: 'gt', value: 1000 }, { amount: 2000 })).toBe(true);
    expect(evaluateCondition({ fact: 'amount', op: 'gt', value: 1000 }, { amount: 500 })).toBe(false);
    expect(evaluateCondition({ fact: 'tier', op: 'in', value: ['VIP', 'GOLD'] }, { tier: 'VIP' })).toBe(true);
  });

  it('evaluates all/any/not trees', () => {
    const facts = { amount: 150000, daysOverdue: 2 };
    expect(
      evaluateCondition(
        { all: [{ fact: 'amount', op: 'gte', value: 100000 }, { fact: 'daysOverdue', op: 'gte', value: 1 }] },
        facts,
      ),
    ).toBe(true);
    expect(evaluateCondition({ not: { fact: 'amount', op: 'lt', value: 100000 } }, facts)).toBe(true);
    expect(evaluateCondition({ any: [{ fact: 'amount', op: 'lt', value: 100 }] }, facts)).toBe(false);
  });
});

describe('evaluatePolicies', () => {
  const highValue: PolicyRule = {
    id: 'high',
    name: 'High value fast escalation',
    priority: 10,
    condition: { fact: 'amount', op: 'gt', value: 100000 },
    action: { escalateAfterHours: 24, priority: 'CRITICAL' },
  };
  const lowValue: PolicyRule = {
    id: 'low',
    name: 'Default escalation',
    priority: 100,
    condition: { fact: 'amount', op: 'gte', value: 0 },
    action: { escalateAfterHours: 120, priority: 'NORMAL' },
  };

  it('lets the most specific (lower priority number) rule win on conflict', () => {
    const d = evaluatePolicies([lowValue, highValue], { amount: 250000 });
    expect(d.matched).toEqual(['high', 'low']);
    expect(d.action.escalateAfterHours).toBe(24);
    expect(d.action.priority).toBe('CRITICAL');
  });

  it('falls back to the general rule when the specific one does not match', () => {
    const d = evaluatePolicies([lowValue, highValue], { amount: 5000 });
    expect(d.matched).toEqual(['low']);
    expect(d.action.escalateAfterHours).toBe(120);
  });
});

import { ConditionRegistry, ConditionFacts } from './condition-registry';

const facts = (over: Partial<ConditionFacts> = {}): ConditionFacts => ({
  invoicePaid: false,
  customerReplied: false,
  now: new Date('2026-01-05T06:00:00Z'), // Monday, 11:30 IST
  amount: 50000,
  daysOverdue: 5,
  ...over,
});

describe('ConditionRegistry', () => {
  const reg = new ConditionRegistry();

  it('registers the built-in conditions', () => {
    expect(reg.has('invoice.paid')).toBe(true);
    expect(reg.has('amount.gt')).toBe(true);
    expect(reg.has('officeHours')).toBe(true);
  });

  it('evaluates invoice.paid / customer.replied from facts', () => {
    expect(reg.evaluate({ type: 'invoice.paid' }, facts({ invoicePaid: true }))).toBe(true);
    expect(reg.evaluate({ type: 'customer.replied' }, facts())).toBe(false);
  });

  it('evaluates parameterised amount conditions', () => {
    expect(reg.evaluate({ type: 'amount.gt', params: { value: 10000 } }, facts({ amount: 50000 }))).toBe(true);
    expect(reg.evaluate({ type: 'amount.gt', params: { value: 100000 } }, facts({ amount: 50000 }))).toBe(false);
    expect(reg.evaluate({ type: 'daysOverdue.gte', params: { value: 5 } }, facts({ daysOverdue: 5 }))).toBe(true);
  });

  it('evaluates time-based conditions', () => {
    expect(reg.evaluate({ type: 'officeHours' }, facts({ now: new Date('2026-01-05T06:00:00Z') }))).toBe(true);
    expect(reg.evaluate({ type: 'officeHours' }, facts({ now: new Date('2026-01-05T20:00:00Z') }))).toBe(false);
    expect(reg.evaluate({ type: 'weekend' }, facts({ now: new Date('2026-01-04T06:00:00Z') }))).toBe(true); // Sunday
  });

  it('treats an unregistered condition as false (fail-safe)', () => {
    expect(reg.evaluate({ type: 'nope.unknown' }, facts())).toBe(false);
  });

  it('supports registering a custom condition', () => {
    reg.register({ type: 'always', evaluate: () => true });
    expect(reg.evaluate({ type: 'always' }, facts())).toBe(true);
  });
});

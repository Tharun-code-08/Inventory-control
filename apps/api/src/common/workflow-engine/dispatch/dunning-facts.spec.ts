import { isCustomerStep, stepPriority, toPolicyFacts } from './dunning-facts';
import { DunningStepEventPayload } from '../dunning-delivery';

const payload = (over: Partial<DunningStepEventPayload> = {}): DunningStepEventPayload => ({
  invoiceId: 'inv',
  invoiceNumber: 'INV-1',
  customerId: 'cust',
  stepIndex: 0,
  tone: 'friendly',
  audience: 'customer',
  daysFromDue: -3,
  balanceDue: 5000,
  channels: ['WHATSAPP', 'EMAIL'],
  ...over,
});

describe('dunning-facts', () => {
  it('maps ladder priority to send priority', () => {
    expect(stepPriority(payload({ stepIndex: 0 }))).toBe('NORMAL');
    expect(stepPriority(payload({ stepIndex: 2 }))).toBe('HIGH');
    expect(stepPriority(payload({ stepIndex: 5 }))).toBe('CRITICAL');
  });

  it('builds policy facts from the step and engagement', () => {
    const facts = toPolicyFacts(payload({ balanceDue: 120000, daysFromDue: 10 }), { reliability: 20, customerTier: 'VIP' });
    expect(facts.amount).toBe(120000);
    expect(facts.daysOverdue).toBe(10);
    expect(facts.reliability).toBe(20);
    expect(facts.customerTier).toBe('VIP');
  });

  it('classifies customer vs staff steps', () => {
    expect(isCustomerStep(payload({ audience: 'customer' }))).toBe(true);
    expect(isCustomerStep(payload({ audience: 'staff' }))).toBe(false);
  });
});

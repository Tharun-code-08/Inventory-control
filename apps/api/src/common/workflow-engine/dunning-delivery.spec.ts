import {
  DunningStepEventPayload,
  nextFallback,
  planDunningDelivery,
  reduceThreadOnLifecycle,
} from './dunning-delivery';

const stepPayload = (over: Partial<DunningStepEventPayload> = {}): DunningStepEventPayload => ({
  invoiceId: 'inv-1',
  invoiceNumber: 'INV-1',
  customerId: 'cust-1',
  stepIndex: 2,
  tone: 'firm',
  audience: 'customer',
  daysFromDue: 3,
  balanceDue: 1000,
  channels: ['WHATSAPP', 'EMAIL'],
  ...over,
});

describe('planDunningDelivery', () => {
  it('produces ordered fallback attempts with the step priority', () => {
    const plan = planDunningDelivery(stepPayload());
    expect(plan.attempts).toEqual([
      { channel: 'WHATSAPP', order: 0 },
      { channel: 'EMAIL', order: 1 },
    ]);
    expect(plan.priority).toBe('HIGH'); // step 2 = firm reminder
    expect(plan.tone).toBe('firm');
    expect(plan.audience).toBe('customer');
  });

  it('defaults priority to NORMAL for an out-of-range step index', () => {
    const plan = planDunningDelivery(stepPayload({ stepIndex: 99, channels: ['EMAIL'] }));
    expect(plan.priority).toBe('NORMAL');
  });
});

describe('nextFallback', () => {
  it('advances to the next attempt on failure, then exhausts', () => {
    const attempts = planDunningDelivery(stepPayload()).attempts;
    expect(nextFallback(attempts, 0)).toEqual({ channel: 'EMAIL', order: 1 });
    expect(nextFallback(attempts, 1)).toBeNull();
  });
});

describe('reduceThreadOnLifecycle', () => {
  it('resolves an active thread when the invoice is paid', () => {
    expect(reduceThreadOnLifecycle('invoice.paid', 'ACTIVE')).toMatchObject({ state: 'RESOLVED' });
  });

  it('is idempotent for an already-resolved thread on payment', () => {
    expect(reduceThreadOnLifecycle('invoice.paid', 'RESOLVED')).toBeNull();
  });

  it('pauses an active or escalated thread when the customer replies', () => {
    expect(reduceThreadOnLifecycle('customer.replied', 'ACTIVE')).toMatchObject({ state: 'PAUSED' });
    expect(reduceThreadOnLifecycle('customer.replied', 'ESCALATED')).toMatchObject({
      state: 'PAUSED',
    });
  });

  it('ignores a reply on a paused/resolved/stopped thread', () => {
    expect(reduceThreadOnLifecycle('customer.replied', 'PAUSED')).toBeNull();
    expect(reduceThreadOnLifecycle('customer.replied', 'RESOLVED')).toBeNull();
    expect(reduceThreadOnLifecycle('customer.replied', 'STOPPED')).toBeNull();
  });
});

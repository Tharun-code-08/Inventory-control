import {
  DunningCandidate,
  daysFromDue,
  dunningPriorityScore,
  planDunningSweep,
  toDunningStepEvent,
} from './dunning-sweep';

const DAY = 86_400_000;
const NOW = new Date('2026-07-30T00:00:00.000Z');

const candidate = (over: Partial<DunningCandidate> = {}): DunningCandidate => ({
  invoiceId: 'inv-1',
  invoiceNumber: 'INV-1',
  companyId: 'co-1',
  customerId: 'cust-1',
  dueDate: new Date(NOW.getTime() + 3 * DAY), // due in 3 days → T-3 step is due
  balanceDue: 1000,
  invoiceStatus: 'ISSUED',
  customerReplied: false,
  consent: { whatsapp: true, email: true },
  thread: null,
  ...over,
});

describe('daysFromDue', () => {
  it('is negative before due, positive when overdue', () => {
    expect(daysFromDue(NOW, new Date(NOW.getTime() + 5 * DAY))).toBe(-5);
    expect(daysFromDue(NOW, new Date(NOW.getTime() - 5 * DAY))).toBe(5);
  });
});

describe('planDunningSweep', () => {
  it('emits a send + advances the thread for a due first step', () => {
    const plan = planDunningSweep([candidate()], NOW);
    expect(plan.sends).toHaveLength(1);
    expect(plan.sends[0].step.index).toBe(0);
    expect(plan.sends[0].channels).toEqual(['WHATSAPP', 'EMAIL']);

    expect(plan.threadOps).toHaveLength(1);
    expect(plan.threadOps[0]).toMatchObject({ ladderStep: 0, state: 'ACTIVE' });
    // nextActionAt should be the due date (offset 0 = step 1).
    expect(plan.threadOps[0].nextActionAt?.getTime()).toBe(candidate().dueDate!.getTime());
  });

  it('resolves the thread and emits nothing when paid', () => {
    const plan = planDunningSweep([candidate({ invoiceStatus: 'PAID', balanceDue: 0 })], NOW);
    expect(plan.sends).toHaveLength(0);
    expect(plan.threadOps[0]).toMatchObject({ state: 'RESOLVED' });
  });

  it('skips threads that are paused/resolved/stopped', () => {
    const plan = planDunningSweep(
      [candidate({ thread: { ladderStep: 1, state: 'PAUSED' } })],
      NOW,
    );
    expect(plan.sends).toHaveLength(0);
    expect(plan.threadOps).toHaveLength(0);
    expect(plan.skipped).toHaveLength(1);
  });

  it('skips candidates without a due date', () => {
    const plan = planDunningSweep([candidate({ dueDate: null })], NOW);
    expect(plan.skipped[0].reason).toMatch(/due date/i);
  });

  it('blocks a customer step when consent is missing', () => {
    const plan = planDunningSweep(
      [candidate({ consent: { whatsapp: false, email: false } })],
      NOW,
    );
    expect(plan.sends).toHaveLength(0);
    expect(plan.blocked).toHaveLength(1);
    expect(plan.blocked[0].stepIndex).toBe(0);
  });

  it('marks staff escalation state at the manager step', () => {
    const plan = planDunningSweep(
      [
        candidate({
          dueDate: new Date(NOW.getTime() - 14 * DAY), // 14 days overdue
          thread: { ladderStep: 3, state: 'ACTIVE' },
        }),
      ],
      NOW,
    );
    expect(plan.sends[0].step.audience).toBe('staff');
    expect(plan.threadOps[0].state).toBe('ESCALATED');
  });

  it('orders sends by priority score and honours the batch limit', () => {
    const big = candidate({ invoiceId: 'big', balanceDue: 100000 });
    const small = candidate({ invoiceId: 'small', balanceDue: 500 });
    const plan = planDunningSweep([small, big], NOW, { batchLimit: 1 });
    expect(plan.sends).toHaveLength(1);
    expect(plan.sends[0].invoiceId).toBe('big'); // higher balance → higher score
  });

  it('produces a schema-shaped dunning-step event payload', () => {
    const plan = planDunningSweep([candidate()], NOW);
    const payload = toDunningStepEvent(plan.sends[0]);
    expect(payload).toMatchObject({
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-1',
      customerId: 'cust-1',
      stepIndex: 0,
      tone: 'friendly',
      audience: 'customer',
      channels: ['WHATSAPP', 'EMAIL'],
    });
    expect(typeof payload.daysFromDue).toBe('number');
    expect(typeof payload.balanceDue).toBe('number');
  });
});

describe('dunningPriorityScore', () => {
  it('weights amount, overdue days, tier and prior failures', () => {
    const a = dunningPriorityScore({ balanceDue: 1000, daysFromDue: 10 });
    const b = dunningPriorityScore({ balanceDue: 1000, daysFromDue: 0 });
    expect(a).toBeGreaterThan(b);
    // pre-due days never subtract from the score.
    expect(dunningPriorityScore({ balanceDue: 100, daysFromDue: -30 })).toBe(100 * 0.4);
  });
});

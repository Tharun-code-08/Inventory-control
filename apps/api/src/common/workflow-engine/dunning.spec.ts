import {
  DUNNING_LADDER,
  DunningInput,
  computeNextAction,
  resolveConsentedChannels,
} from './dunning';

const base: DunningInput = {
  daysFromDue: 0,
  balanceDue: 1000,
  invoiceStatus: 'ISSUED',
  customerReplied: false,
  lastCompletedStep: -1,
  consent: { whatsapp: true, email: true },
};

describe('dunning ladder definition', () => {
  it('has strictly increasing day offsets and contiguous indexes', () => {
    for (let i = 0; i < DUNNING_LADDER.length; i++) {
      expect(DUNNING_LADDER[i].index).toBe(i);
      if (i > 0) {
        expect(DUNNING_LADDER[i].dayOffset).toBeGreaterThan(DUNNING_LADDER[i - 1].dayOffset);
      }
    }
  });

  it('escalation steps target staff via in-app only', () => {
    for (const step of DUNNING_LADDER.filter((s) => s.audience === 'staff')) {
      expect(step.channelOrder).toEqual(['IN_APP']);
    }
  });
});

describe('computeNextAction — stop/pause invariants win over the schedule', () => {
  it('stops when the invoice is paid', () => {
    expect(computeNextAction({ ...base, invoiceStatus: 'PAID' }).kind).toBe('STOP');
  });

  it('stops when the balance is cleared even if status lags', () => {
    expect(computeNextAction({ ...base, balanceDue: 0 }).kind).toBe('STOP');
  });

  it('stops for void/draft (not collectible)', () => {
    expect(computeNextAction({ ...base, invoiceStatus: 'VOID' }).kind).toBe('STOP');
    expect(computeNextAction({ ...base, invoiceStatus: 'DRAFT' }).kind).toBe('STOP');
  });

  it('pauses when the customer replied — even when a step is due', () => {
    const d = computeNextAction({ ...base, customerReplied: true, daysFromDue: 30 });
    expect(d.kind).toBe('PAUSE');
  });
});

describe('computeNextAction — stepping through the ladder', () => {
  it('waits before the first step is due', () => {
    const d = computeNextAction({ ...base, daysFromDue: -10, lastCompletedStep: -1 });
    expect(d.kind).toBe('WAIT');
    expect(d.step?.index).toBe(0);
    expect(d.waitUntilOffset).toBe(-3);
  });

  it('sends the friendly reminder at T-3', () => {
    const d = computeNextAction({ ...base, daysFromDue: -3, lastCompletedStep: -1 });
    expect(d.kind).toBe('SEND');
    expect(d.step?.index).toBe(0);
    expect(d.channels).toEqual(['WHATSAPP', 'EMAIL']);
  });

  it('advances exactly one step at a time (no skipping) when far overdue', () => {
    // 10 days overdue but only step 1 completed → next is step 2, not step 3.
    const d = computeNextAction({ ...base, daysFromDue: 10, lastCompletedStep: 1 });
    expect(d.kind).toBe('SEND');
    expect(d.step?.index).toBe(2);
  });

  it('waits when the next step is completed but its time has not arrived', () => {
    const d = computeNextAction({ ...base, daysFromDue: 1, lastCompletedStep: 1 });
    expect(d.kind).toBe('WAIT');
    expect(d.step?.index).toBe(2);
    expect(d.waitUntilOffset).toBe(3);
  });

  it('escalates to staff in-app at the manager step', () => {
    const d = computeNextAction({ ...base, daysFromDue: 14, lastCompletedStep: 3 });
    expect(d.kind).toBe('SEND');
    expect(d.step?.audience).toBe('staff');
    expect(d.channels).toEqual(['IN_APP']);
  });

  it('reports EXHAUSTED after the last step', () => {
    const d = computeNextAction({
      ...base,
      daysFromDue: 60,
      lastCompletedStep: DUNNING_LADDER.length - 1,
    });
    expect(d.kind).toBe('EXHAUSTED');
  });
});

describe('computeNextAction — consent gating for customer steps', () => {
  it('drops WhatsApp when not opted in, falling back to email', () => {
    const d = computeNextAction({
      ...base,
      daysFromDue: -3,
      consent: { whatsapp: false, email: true },
    });
    expect(d.kind).toBe('SEND');
    expect(d.channels).toEqual(['EMAIL']);
  });

  it('blocks a customer step when no channel is consented', () => {
    const d = computeNextAction({
      ...base,
      daysFromDue: -3,
      consent: { whatsapp: false, email: false },
    });
    expect(d.kind).toBe('BLOCKED_NO_CONSENT');
    expect(d.step?.index).toBe(0);
  });
});

describe('resolveConsentedChannels', () => {
  it('preserves fallback order and never returns IN_APP for customers', () => {
    expect(
      resolveConsentedChannels(['EMAIL', 'WHATSAPP', 'IN_APP'], { whatsapp: true, email: true }),
    ).toEqual(['EMAIL', 'WHATSAPP']);
  });
});

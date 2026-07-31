import { graphActionToStepPayload, graphEscalateToStepPayload, StepContext } from './graph-step-payload';

const ctx: StepContext = {
  invoiceId: 'inv-1',
  invoiceNumber: 'INV-1',
  customerId: 'cust-1',
  balanceDue: 5000,
  daysFromDue: 3,
};

describe('graph-step-payload', () => {
  it('maps a customer ACTION with AUTO channel to a customer step over both channels', () => {
    const p = graphActionToStepPayload({ type: 'notify.customer', channel: 'AUTO', tone: 'firm' }, ctx);
    expect(p.audience).toBe('customer');
    expect(p.tone).toBe('firm');
    expect(p.stepIndex).toBe(2);
    expect(p.channels).toEqual(['WHATSAPP', 'EMAIL']);
  });

  it('honours an explicit channel on the action', () => {
    const p = graphActionToStepPayload({ type: 'notify.customer', channel: 'EMAIL', tone: 'final' }, ctx);
    expect(p.channels).toEqual(['EMAIL']);
    expect(p.stepIndex).toBe(3);
  });

  it('defaults tone to reminder when unset', () => {
    const p = graphActionToStepPayload({ type: 'notify.customer' }, ctx);
    expect(p.tone).toBe('reminder');
    expect(p.stepIndex).toBe(1);
  });

  it('builds a staff IN_APP escalation payload', () => {
    const p = graphEscalateToStepPayload(ctx);
    expect(p.audience).toBe('staff');
    expect(p.channels).toEqual(['IN_APP']);
    expect(p.tone).toBe('escalation');
  });
});

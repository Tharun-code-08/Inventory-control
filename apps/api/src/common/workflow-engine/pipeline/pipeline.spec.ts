import { buildDefaultPipeline } from './stages';
import { PipelineContext, initialDecision } from './pipeline-context';
import { DedupStore } from '../dispatch/dedup-store';
import { PolicyDecision } from '../policy/policy-types';

const now = new Date('2026-01-05T09:00:00Z'); // 14:30 IST, within window

function ctx(over: Partial<PipelineContext> = {}, policy?: PolicyDecision): PipelineContext {
  return {
    input: {
      eventId: 'e', correlationId: 'c', companyId: 'co', customerId: 'cust',
      invoiceId: 'inv', invoiceNumber: 'INV-1', tone: 'firm', balanceDue: 50000, daysOverdue: 3, stepIndex: 2,
    },
    gathered: {
      now,
      consent: { whatsapp: true, email: true },
      inAppAllowed: false,
      counts: { whatsapp: 0, email: 0 },
      sendWindow: { businessUtcOffsetMinutes: 330, quietStartHour: 21, quietEndHour: 8 },
    },
    precomputed: { policy: policy ?? { action: {}, matched: [] } },
    decision: initialDecision(),
    ...over,
  };
}

describe('NotificationPipeline', () => {
  it('runs all 9 stages in order', () => {
    const p = buildDefaultPipeline(new DedupStore());
    expect(p.stageNames).toEqual([
      'context', 'consent', 'priority', 'policy', 'deduplication',
      'workflow', 'channel-selection', 'scheduling', 'dispatch',
    ]);
  });

  it('selects WhatsApp and marks ready for a consented firm reminder', () => {
    const out = buildDefaultPipeline(new DedupStore()).run(ctx());
    expect(out.decision.suppressed).toBe(false);
    expect(out.decision.channel).toBe('WHATSAPP');
    expect(out.decision.sendNow).toBe(true);
    expect(out.decision.priority).toBe('HIGH'); // firm tone
  });

  it('suppresses at the consent stage when no channel is consented', () => {
    const out = buildDefaultPipeline(new DedupStore()).run(
      ctx({ gathered: { ...ctx().gathered, consent: { whatsapp: false, email: false } } }),
    );
    expect(out.decision.suppressed).toBe(true);
    expect(out.decision.suppressReason).toMatch(/no consented channel/);
    expect(out.decision.channel).toBeNull(); // short-circuited before channel selection
  });

  it('suppresses when policy says suppress', () => {
    const out = buildDefaultPipeline(new DedupStore()).run(
      ctx({}, { action: { suppress: true }, matched: ['hold'] }),
    );
    expect(out.decision.suppressed).toBe(true);
    expect(out.decision.suppressReason).toMatch(/policy suppress/);
  });

  it('honours a policy-forced channel', () => {
    const out = buildDefaultPipeline(new DedupStore()).run(
      ctx({}, { action: { channel: 'EMAIL' }, matched: ['prefer-email'] }),
    );
    expect(out.decision.channel).toBe('EMAIL');
  });

  it('suppresses a semantic duplicate on the second run in the same day bucket', () => {
    const store = new DedupStore();
    const first = buildDefaultPipeline(store).run(ctx());
    expect(first.decision.suppressed).toBe(false);
    const second = buildDefaultPipeline(store).run(ctx());
    expect(second.decision.suppressed).toBe(true);
    expect(second.decision.suppressReason).toMatch(/duplicate/);
  });

  it('defers non-critical sends inside quiet hours', () => {
    const quietNow = new Date('2026-01-05T17:00:00Z'); // 22:30 IST
    const out = buildDefaultPipeline(new DedupStore()).run(
      ctx({ gathered: { ...ctx().gathered, now: quietNow } }),
    );
    expect(out.decision.channel).toBe('WHATSAPP');
    expect(out.decision.sendNow).toBe(false);
    expect(out.decision.deferUntil).not.toBeNull();
  });
});

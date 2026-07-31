import { buildDefaultPipeline } from './stages';
import { PipelineContext, initialDecision } from './pipeline-context';
import { DedupStore } from '../dispatch/dedup-store';
import { PolicyDecision } from '../policy/policy-types';

const now = new Date('2026-01-05T09:00:00Z'); // 14:30 IST, within window

/** In-memory stand-in for the Redis-backed DedupStore (atomic claim). */
function fakeDedup(): DedupStore {
  const seen = new Set<string>();
  return {
    markIfNew: async (hash: string) => {
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    },
  } as unknown as DedupStore;
}

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
    const p = buildDefaultPipeline(fakeDedup());
    expect(p.stageNames).toEqual([
      'context', 'consent', 'priority', 'policy', 'deduplication',
      'workflow', 'channel-selection', 'scheduling', 'dispatch',
    ]);
  });

  it('selects WhatsApp and marks ready for a consented firm reminder', async () => {
    const out = (await buildDefaultPipeline(fakeDedup()).run(ctx())).decision;
    expect(out.suppressed).toBe(false);
    expect(out.channel).toBe('WHATSAPP');
    expect(out.sendNow).toBe(true);
    expect(out.priority).toBe('HIGH'); // firm tone
  });

  it('suppresses at the consent stage when no channel is consented', async () => {
    const out = (await buildDefaultPipeline(fakeDedup()).run(
      ctx({ gathered: { ...ctx().gathered, consent: { whatsapp: false, email: false } } }),
    )).decision;
    expect(out.suppressed).toBe(true);
    expect(out.suppressReason).toMatch(/no consented channel/);
    expect(out.channel).toBeNull(); // short-circuited before channel selection
  });

  it('suppresses when policy says suppress', async () => {
    const out = (await buildDefaultPipeline(fakeDedup()).run(
      ctx({}, { action: { suppress: true }, matched: ['hold'] }),
    )).decision;
    expect(out.suppressed).toBe(true);
    expect(out.suppressReason).toMatch(/policy suppress/);
  });

  it('honours a policy-forced channel', async () => {
    const out = (await buildDefaultPipeline(fakeDedup()).run(
      ctx({}, { action: { channel: 'EMAIL' }, matched: ['prefer-email'] }),
    )).decision;
    expect(out.channel).toBe('EMAIL');
  });

  it('suppresses a semantic duplicate on the second run in the same day bucket', async () => {
    const store = fakeDedup();
    const first = (await buildDefaultPipeline(store).run(ctx())).decision;
    expect(first.suppressed).toBe(false);
    const second = (await buildDefaultPipeline(store).run(ctx())).decision;
    expect(second.suppressed).toBe(true);
    expect(second.suppressReason).toMatch(/duplicate/);
  });

  it('defers non-critical sends inside quiet hours', async () => {
    const quietNow = new Date('2026-01-05T17:00:00Z'); // 22:30 IST
    const out = (await buildDefaultPipeline(fakeDedup()).run(
      ctx({ gathered: { ...ctx().gathered, now: quietNow } }),
    )).decision;
    expect(out.channel).toBe('WHATSAPP');
    expect(out.sendNow).toBe(false);
    expect(out.deferUntil).not.toBeNull();
  });
});

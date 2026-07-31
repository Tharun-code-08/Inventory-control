/**
 * The default notification pipeline stages (Plan §4). Each is a pure
 * `evaluate(ctx) → ctx`; ordering is Context → Consent → Priority → Policy →
 * Deduplication → Workflow → Channel Selection → Scheduling → Dispatch.
 */
import { PipelineStage, NotificationPipeline } from './stage';
import { PipelineContext } from './pipeline-context';
import { resolveChannel } from '../routing/channel-router';
import { SendPriority } from '../send-window';
import { contentHash, dayBucket, DedupStore } from '../dispatch/dedup-store';

const TONE_PRIORITY: Readonly<Record<string, SendPriority>> = {
  friendly: 'NORMAL',
  reminder: 'NORMAL',
  firm: 'HIGH',
  final: 'HIGH',
  escalation: 'CRITICAL',
};

const withReason = (ctx: PipelineContext, reason: string): PipelineContext => ({
  ...ctx,
  decision: { ...ctx.decision, reasons: [...ctx.decision.reasons, reason] },
});

const suppress = (ctx: PipelineContext, reason: string): PipelineContext => ({
  ...ctx,
  decision: { ...ctx.decision, suppressed: true, suppressReason: reason, reasons: [...ctx.decision.reasons, reason] },
});

/** Stage 1 — marks the run; a hook point for future context enrichment. */
export const ContextStage: PipelineStage = {
  name: 'context',
  evaluate: (ctx) => withReason(ctx, `context:${ctx.input.invoiceNumber}`),
};

/** Stage 2 — no consented channel and no in-app fallback ⇒ suppress. */
export const ConsentStage: PipelineStage = {
  name: 'consent',
  evaluate: (ctx) => {
    const { consent, inAppAllowed } = ctx.gathered;
    if (!consent.whatsapp && !consent.email && !inAppAllowed) {
      return suppress(ctx, 'no consented channel');
    }
    return ctx;
  },
};

/** Stage 3 — derive send priority from tone (policy may override in stage 4). */
export const PriorityStage: PipelineStage = {
  name: 'priority',
  evaluate: (ctx) => ({
    ...ctx,
    decision: { ...ctx.decision, priority: TONE_PRIORITY[ctx.input.tone] ?? 'NORMAL' },
  }),
};

/** Stage 4 — apply the resolved policy: suppress / force channel / caps / priority. */
export const PolicyStage: PipelineStage = {
  name: 'policy',
  evaluate: (ctx) => {
    const action = ctx.precomputed.policy.action;
    if (action.suppress === true) {
      return suppress(ctx, `policy suppress [${ctx.precomputed.policy.matched.join(',')}]`);
    }
    const decision = { ...ctx.decision };
    if (action.channel === 'WHATSAPP' || action.channel === 'EMAIL' || action.channel === 'IN_APP') {
      decision.forcedChannel = action.channel;
    }
    if (typeof action.maxPerDay === 'number' && action.maxPerDay >= 0) {
      decision.caps = { whatsappPerDay: action.maxPerDay, emailPerDay: action.maxPerDay };
    }
    if (typeof action.priority === 'string') {
      decision.priority = action.priority as SendPriority;
    }
    return { ...ctx, decision };
  },
};

/** Stage 5 — content hash + TTL; a semantic duplicate is suppressed. */
export class DeduplicationStage implements PipelineStage {
  readonly name = 'deduplication';
  constructor(private readonly store: DedupStore) {}
  evaluate(ctx: PipelineContext): PipelineContext {
    const hash = contentHash({
      companyId: ctx.input.companyId,
      customerId: ctx.input.customerId,
      invoiceId: ctx.input.invoiceId,
      tone: ctx.input.tone,
      bucket: dayBucket(ctx.gathered.now),
    });
    if (this.store.isDuplicate(hash, ctx.gathered.now)) {
      return suppress(ctx, 'duplicate send suppressed (hash+ttl)');
    }
    this.store.remember(hash, ctx.gathered.now);
    return { ...ctx, decision: { ...ctx.decision, dedupKey: hash } };
  }
}

/** Stage 6 — workflow marker (node already chosen upstream by the graph executor). */
export const WorkflowStage: PipelineStage = {
  name: 'workflow',
  evaluate: (ctx) => ctx,
};

/** Stage 7 — consent + engagement + rate-limit + quiet-hours → a channel. */
export const ChannelSelectionStage: PipelineStage = {
  name: 'channel-selection',
  evaluate: (ctx) => {
    const routed = resolveChannel({
      consent: ctx.gathered.consent,
      inAppAllowed: ctx.gathered.inAppAllowed,
      engagement: ctx.gathered.engagement,
      forcedChannel: ctx.decision.forcedChannel,
      counts: ctx.gathered.counts,
      caps: ctx.decision.caps,
      now: ctx.gathered.now,
      sendWindow: ctx.gathered.sendWindow,
      priority: ctx.decision.priority,
    });
    const decision = {
      ...ctx.decision,
      channel: routed.channel,
      order: [...routed.order],
      sendNow: routed.sendNow,
      deferUntil: routed.deferUntil,
      reasons: [...ctx.decision.reasons, routed.reason],
    };
    if (!routed.channel) decision.suppressed = false; // not suppressed — just deferred to digest
    return { ...ctx, decision };
  },
};

/** Stage 8 — finalise scheduling: no channel ⇒ hold; deferred ⇒ note resume. */
export const SchedulingStage: PipelineStage = {
  name: 'scheduling',
  evaluate: (ctx) => {
    if (!ctx.decision.channel) return withReason(ctx, 'held: no sendable channel');
    if (!ctx.decision.sendNow) return withReason(ctx, `deferred to ${ctx.decision.deferUntil?.toISOString() ?? 'window'}`);
    return withReason(ctx, `ready on ${ctx.decision.channel}`);
  },
};

/** Stage 9 — dispatch marker; the caller/queue performs the actual send. */
export const DispatchStage: PipelineStage = {
  name: 'dispatch',
  evaluate: (ctx) => ctx,
};

/** Assemble the default 9-stage pipeline. */
export function buildDefaultPipeline(dedup: DedupStore): NotificationPipeline {
  return new NotificationPipeline([
    ContextStage,
    ConsentStage,
    PriorityStage,
    PolicyStage,
    new DeduplicationStage(dedup),
    WorkflowStage,
    ChannelSelectionStage,
    SchedulingStage,
    DispatchStage,
  ]);
}

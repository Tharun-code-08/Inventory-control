import { Inject, Injectable, Logger } from '@nestjs/common';
import { DeliveryChannel, DeliveryState, EventClassification, RoleName } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { MetricsService } from '@/common/observability/metrics.service';
import { EventEnvelope } from '../../event-platform/event-envelope';
import { WorkflowDecisionLogService } from '../workflow-decision-log.service';
import { PolicyService } from '../policy/policy.service';
import { AiAdvisorService } from '../ai/ai-advisor.service';
import { TimelineService } from '../analytics/timeline.service';
import { FeatureFlagsService } from '../ops/feature-flags.service';
import { RateCaps } from '../rate-limit';
import { NotificationPipeline } from '../pipeline/stage';
import { buildDefaultPipeline } from '../pipeline/stages';
import { initialDecision } from '../pipeline/pipeline-context';
import { DedupStore } from './dedup-store';
import { DispatchProducer } from './dispatch.producer';
import { DispatchBatchService, BatchItem } from './dispatch-batch.service';
import { DispatchJobData, composeDigest } from './dispatch-job';
import { TONE_TO_STEP_INDEX } from '../graph/graph-step-payload';
import { ConsentState, toDunningConsent } from '../consent';
import { computeReliabilityScore, EMPTY_ENGAGEMENT, EngagementSnapshot } from '../engagement';
import { reduceThreadOnLifecycle } from '../dunning-delivery';
import type { ThreadState } from '../dunning-sweep';
import type { DunningStepEventPayload } from '../dunning-delivery';
import { isCustomerStep, stepPriority, toPolicyFacts } from './dunning-facts';
import {
  CUSTOMER_MESSAGE_SENDER,
  CustomerMessageSender,
  SendableChannel,
} from './customer-message-sender';

const DEFAULT_CAPS: RateCaps = { whatsappPerDay: 2, emailPerDay: 5 };
const DEFAULT_SEND_WINDOW = { businessUtcOffsetMinutes: 330, quietStartHour: 21, quietEndHour: 8 };
const DUNNING_ENTITY_TYPE = 'invoice';
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The live customer-dunning dispatch pipeline (Plan §3 single decision engine,
 * §7 policy, §8 channel routing / AI advisor, §11 dispatch, §12 timeline).
 *
 * Consumes the three lifecycle events the dunning sweep + payments + WhatsApp
 * webhook already emit:
 *   - invoice.dunning-step → route (consent → policy → engagement → rate-limit →
 *     quiet-hours) → ledger + timeline + (adapter) send,
 *   - invoice.paid         → resolve the followup thread (stop-on-payment),
 *   - customer.replied     → pause the thread (stop-on-reply) + engagement signal.
 *
 * Safe by default: the external send goes through the injected
 * {@link CustomerMessageSender}, which is the no-network LedgerOnlySender unless
 * a real adapter is bound AND the tenant's `channel-routing` flag is on. Every
 * branch is idempotent and fully decision-logged.
 */
@Injectable()
export class CustomerDispatchService {
  private readonly logger = new Logger(CustomerDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly decisionLog: WorkflowDecisionLogService,
    private readonly policy: PolicyService,
    private readonly advisor: AiAdvisorService,
    private readonly timeline: TimelineService,
    private readonly features: FeatureFlagsService,
    private readonly dedup: DedupStore,
    private readonly producer: DispatchProducer,
    private readonly batch: DispatchBatchService,
    private readonly metrics: MetricsService,
    @Inject(CUSTOMER_MESSAGE_SENDER) private readonly sender: CustomerMessageSender,
  ) {
    this.pipeline = buildDefaultPipeline(this.dedup);
  }

  /** The 9-stage decision pipeline (Plan §4). */
  private readonly pipeline: NotificationPipeline;

  /** True for the customer-dunning lifecycle events this service owns. */
  static handles(eventType: string): boolean {
    return (
      eventType === 'invoice.dunning-step' ||
      eventType === 'invoice.paid' ||
      eventType === 'customer.replied'
    );
  }

  async handle(envelope: EventEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case 'invoice.dunning-step':
        return this.handleStep(envelope);
      case 'invoice.paid':
        return this.handlePaid(envelope);
      case 'customer.replied':
        return this.handleReplied(envelope);
      default:
        return;
    }
  }

  // ── invoice.dunning-step ──────────────────────────────────────────────────
  private async handleStep(envelope: EventEnvelope): Promise<void> {
    const payload = envelope.payload as unknown as DunningStepEventPayload;

    // Internal escalations (steps 4–5) fan out to staff in-app, not the customer.
    if (!isCustomerStep(payload)) {
      return this.escalateToStaff(envelope, payload);
    }

    // Idempotency: one send per (event, customer). Relay retries are no-ops.
    const already = await this.prisma.notificationDelivery.findFirst({
      where: { eventId: envelope.eventId, recipientUserId: payload.customerId },
      select: { id: true },
    });
    if (already) {
      await this.record(envelope, payload.customerId, 'IN_APP', 'SUPPRESSED_DUPLICATE', stepPriority(payload), 'Already dispatched for this (event, customer).');
      return;
    }

    const [consent, engagement, counts] = await Promise.all([
      this.loadConsent(payload.customerId),
      this.loadEngagement(payload.customerId),
      this.rollingCounts(payload.customerId),
    ]);

    const reliability = engagement ? computeReliabilityScore(engagement) : 50;
    const facts = toPolicyFacts(payload, { reliability });
    const policyDecision = await this.policy.decide(envelope.companyId, 'dunning', facts);

    // AI advice is recorded + remembered but never overrides business rules.
    const advice = await this.advisor.advise({
      companyId: envelope.companyId,
      customerId: payload.customerId,
      amount: payload.balanceDue,
      daysOverdue: payload.daysFromDue,
      engagement: engagement ?? undefined,
    });

    // Run the 9-stage decision pipeline (Plan §4): consent → priority → policy →
    // dedup → workflow → channel → scheduling → dispatch.
    const outcome = this.pipeline.run({
      input: {
        eventId: envelope.eventId,
        correlationId: envelope.correlationId,
        companyId: envelope.companyId,
        customerId: payload.customerId,
        invoiceId: payload.invoiceId,
        invoiceNumber: payload.invoiceNumber,
        tone: payload.tone,
        balanceDue: payload.balanceDue,
        daysOverdue: payload.daysFromDue,
        stepIndex: payload.stepIndex,
      },
      gathered: {
        now: envelope.occurredAt,
        consent,
        inAppAllowed: false,
        engagement: engagement ?? undefined,
        counts,
        sendWindow: DEFAULT_SEND_WINDOW,
      },
      precomputed: { policy: policyDecision, advice },
      decision: { ...initialDecision(), caps: DEFAULT_CAPS },
    }).decision;

    const reason = `${outcome.reasons.join(' | ')} | ai=${advice.rationale} (conf ${advice.confidence})`;

    if (outcome.suppressed) {
      const isPolicy = outcome.suppressReason?.startsWith('policy') ?? false;
      await this.record(envelope, payload.customerId, 'IN_APP', isPolicy ? 'SUPPRESSED_POLICY' : 'SUPPRESSED_DUPLICATE', outcome.priority, reason);
      await this.timeline.record({ companyId: envelope.companyId, entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId, kind: 'STOPPED', correlationId: envelope.correlationId, detail: { reason: outcome.suppressReason } });
      return;
    }

    if (!outcome.channel) {
      await this.record(envelope, payload.customerId, 'IN_APP', 'NO_CHANNEL', outcome.priority, reason);
      await this.timeline.record({ companyId: envelope.companyId, entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId, kind: 'STEP_PLANNED', correlationId: envelope.correlationId, detail: { outcome: 'no-channel', order: outcome.order } });
      return;
    }

    const sendable = outcome.order.filter((c): c is SendableChannel => c === 'WHATSAPP' || c === 'EMAIL');
    const job: DispatchJobData = {
      eventId: envelope.eventId,
      correlationId: envelope.correlationId,
      companyId: envelope.companyId,
      customerId: payload.customerId,
      invoiceId: payload.invoiceId,
      invoiceNumber: payload.invoiceNumber,
      tone: payload.tone,
      balanceDue: payload.balanceDue,
      priority: outcome.priority,
      channels: sendable.length ? sendable : [outcome.channel as SendableChannel],
    };

    // Quiet-hours defer → enqueue a delayed job that re-sends when the window
    // opens (Plan §11: the deferred send is no longer just logged).
    if (!outcome.sendNow) {
      await this.record(envelope, payload.customerId, outcome.channel, 'DEFERRED', outcome.priority, reason);
      await this.timeline.record({ companyId: envelope.companyId, entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId, kind: 'STEP_PLANNED', channel: outcome.channel, correlationId: envelope.correlationId, detail: { deferUntil: outcome.deferUntil?.toISOString() ?? null } });
      this.metrics.workflowDispatch.inc({ channel: outcome.channel ?? 'NONE', result: 'deferred' });
      if (outcome.deferUntil) await this.producer.enqueueDeferred(job, outcome.deferUntil);
      return;
    }

    // Low-priority sends are batched into a per-customer digest (Plan Phase 3);
    // HIGH/CRITICAL go out immediately.
    if (outcome.priority === 'NORMAL' || outcome.priority === 'LOW') {
      await this.batch.add(job);
      await this.producer.scheduleFlush(envelope.companyId, payload.customerId);
      this.metrics.workflowDispatch.inc({ channel: outcome.channel ?? 'NONE', result: 'batched' });
      await this.record(envelope, payload.customerId, outcome.channel, 'DEFERRED', outcome.priority, `${reason} | batched for digest`);
      await this.timeline.record({ companyId: envelope.companyId, entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId, kind: 'STEP_PLANNED', channel: outcome.channel, correlationId: envelope.correlationId, detail: { batched: true } });
      return;
    }

    await this.dispatch(envelope, payload, job.channels, consent, reason);
  }

  // ── queue callbacks (Plan §11) ──────────────────────────────────────────────
  /** Perform a deferred send whose quiet-hours window has now opened. */
  async sendDeferred(job: DispatchJobData): Promise<void> {
    const consent = await this.loadConsent(job.customerId);
    await this.sendVia(job, consent);
  }

  /** Send a customer's batched invoices as one coalesced digest. */
  async sendDigest(companyId: string, customerId: string, items: readonly BatchItem[]): Promise<void> {
    if (items.length === 0) return;
    const { summary, total } = composeDigest(items);
    const consent = await this.loadConsent(customerId);
    const job: DispatchJobData = {
      eventId: items[0].eventId,
      correlationId: items[0].correlationId,
      companyId,
      customerId,
      invoiceId: items[0].invoiceId,
      invoiceNumber: items.length > 1 ? `${items.length} invoices` : items[0].invoiceNumber,
      tone: items[0].tone,
      balanceDue: total,
      priority: 'NORMAL',
      channels: this.consentChannels(consent),
    };
    await this.sendVia(job, consent);
    await this.timeline.record({
      companyId,
      entityType: DUNNING_ENTITY_TYPE,
      entityId: items[0].invoiceId,
      kind: 'SENT',
      correlationId: items[0].correlationId,
      detail: { digest: summary, invoiceIds: items.map((i) => i.invoiceId) },
    });
  }

  /** Reconstruct a synthetic event/payload from a queue job and run the send loop. */
  private async sendVia(
    job: DispatchJobData,
    consent: { whatsapp: boolean; email: boolean; addresses: Record<string, string | undefined> },
  ): Promise<void> {
    const envelope = {
      eventId: job.eventId,
      eventType: 'invoice.dunning-step',
      eventVersion: 1,
      aggregateType: 'invoice',
      aggregateId: job.invoiceId,
      companyId: job.companyId,
      occurredAt: new Date(),
      correlationId: job.correlationId,
      classification: EventClassification.FINANCIAL,
      payload: {},
    } as EventEnvelope;
    const payload: DunningStepEventPayload = {
      invoiceId: job.invoiceId,
      invoiceNumber: job.invoiceNumber,
      customerId: job.customerId,
      stepIndex: TONE_TO_STEP_INDEX[job.tone] ?? 1,
      tone: job.tone as DunningStepEventPayload['tone'],
      audience: 'customer',
      daysFromDue: 0,
      balanceDue: job.balanceDue,
      channels: job.channels,
    };
    const channels = job.channels.length ? [...job.channels] : (['WHATSAPP', 'EMAIL'] as SendableChannel[]);
    await this.dispatch(envelope, payload, channels, consent, `queued:${job.priority}`);
  }

  private consentChannels(consent: { whatsapp: boolean; email: boolean }): SendableChannel[] {
    const out: SendableChannel[] = [];
    if (consent.whatsapp) out.push('WHATSAPP');
    if (consent.email) out.push('EMAIL');
    return out;
  }

  /**
   * Send with multi-channel fallback (Plan §8 "fallback automatically", §11).
   * Tries channels in the router's order; on a failed send the next consented
   * channel is attempted (each a numbered attempt on the ledger). Stops at the
   * first success. When channel-routing is off, records a single decision-only
   * ledger row and sends nothing.
   */
  private async dispatch(
    envelope: EventEnvelope,
    payload: DunningStepEventPayload,
    channels: readonly SendableChannel[],
    consent: { whatsapp: boolean; email: boolean; addresses: Record<string, string | undefined> },
    reason: string,
  ): Promise<void> {
    const routingLive = await this.features.isEnabled(envelope.companyId, 'channel-routing');
    let attempt = 0;
    let sentChannel: SendableChannel | null = null;
    let lastDetail = '';
    const tried: string[] = [];

    for (const channel of channels) {
      attempt += 1;
      tried.push(channel);
      let state: DeliveryState = DeliveryState.CREATED;
      let providerMessageId: string | null = null;
      let detail = 'decision-only (channel-routing flag off): no external send';

      if (routingLive) {
        const result = await this.sender.send({
          companyId: envelope.companyId,
          customerId: payload.customerId,
          channel,
          tone: payload.tone,
          invoiceNumber: payload.invoiceNumber,
          balanceDue: payload.balanceDue,
          address: consent.addresses[channel],
        });
        state = result.sent ? DeliveryState.SENT : DeliveryState.FAILED;
        providerMessageId = result.providerMessageId;
        detail = result.detail;
      }

      await this.prisma.notificationDelivery.create({
        data: {
          eventId: envelope.eventId,
          companyId: envelope.companyId,
          recipientUserId: payload.customerId,
          channel: DeliveryChannel[channel],
          attempt,
          state,
          classification: envelope.classification,
          correlationId: envelope.correlationId,
          providerMessageId,
          error: state === DeliveryState.FAILED ? detail : null,
        },
      });
      await this.recordEngagementSignal(envelope.companyId, payload.customerId, channel, 'sent');
      lastDetail = detail;

      // Decision-only: one row, no fallback. Live + sent: done. Live + failed:
      // fall through to the next channel.
      if (!routingLive || state === DeliveryState.SENT) {
        sentChannel = channel;
        break;
      }
    }

    const delivered = sentChannel !== null && routingLive;
    this.metrics.workflowDispatch.inc({ channel: sentChannel ?? channels[0], result: sentChannel ? 'sent' : 'failed' });
    await this.timeline.record({
      companyId: envelope.companyId,
      entityType: DUNNING_ENTITY_TYPE,
      entityId: payload.invoiceId,
      kind: delivered ? 'SENT' : 'STEP_PLANNED',
      channel: sentChannel,
      correlationId: envelope.correlationId,
      detail: { tone: payload.tone, tried, lastDetail },
    });
    await this.record(
      envelope,
      payload.customerId,
      sentChannel ?? channels[0],
      sentChannel ? 'SENT' : 'FAILED',
      stepPriority(payload),
      `${reason} | tried=${tried.join('→')} | ${lastDetail}`,
    );
  }

  // ── staff escalation (steps 4–5) ──────────────────────────────────────────
  private async escalateToStaff(envelope: EventEnvelope, payload: DunningStepEventPayload): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { name: { in: [RoleName.OWNER, RoleName.PURCHASE_MANAGER] } },
        shop: { companyId: envelope.companyId },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    for (const user of users) {
      const dup = await this.prisma.notificationDelivery.findUnique({
        where: { eventId_recipientUserId_channel_attempt: { eventId: envelope.eventId, recipientUserId: user.id, channel: DeliveryChannel.IN_APP, attempt: 1 } },
        select: { id: true },
      });
      if (dup) continue;
      await this.prisma.notificationDelivery.create({
        data: {
          eventId: envelope.eventId,
          companyId: envelope.companyId,
          recipientUserId: user.id,
          channel: DeliveryChannel.IN_APP,
          attempt: 1,
          state: DeliveryState.DELIVERED,
          classification: envelope.classification,
          correlationId: envelope.correlationId,
        },
      });
    }
    await this.timeline.record({ companyId: envelope.companyId, entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId, kind: 'ESCALATED', channel: 'IN_APP', correlationId: envelope.correlationId, detail: { step: payload.stepIndex, recipients: users.length } });
    await this.record(envelope, null, 'IN_APP', 'STAFF_ESCALATION', stepPriority(payload), `Escalated invoice ${payload.invoiceNumber} to ${users.length} staff member(s).`);
  }

  // ── invoice.paid ──────────────────────────────────────────────────────────
  private async handlePaid(envelope: EventEnvelope): Promise<void> {
    const payload = envelope.payload as unknown as { invoiceId: string; customerId?: string };
    const thread = await this.prisma.followupThread.findUnique({
      where: { entityType_entityId: { entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId } },
    });
    if (!thread) return;

    const transition = reduceThreadOnLifecycle('invoice.paid', thread.state as ThreadState);
    if (transition) {
      await this.prisma.followupThread.update({ where: { id: thread.id }, data: { state: transition.state, stopReason: transition.stopReason } });
    }
    if (payload.customerId) await this.recordEngagementSignal(envelope.companyId, payload.customerId, null, 'paid');
    await this.timeline.record({ companyId: envelope.companyId, entityType: DUNNING_ENTITY_TYPE, entityId: payload.invoiceId, threadId: thread.id, kind: 'PAID', correlationId: envelope.correlationId, detail: {} });
    await this.record(envelope, payload.customerId ?? null, 'IN_APP', 'THREAD_RESOLVED', 'NORMAL', transition ? transition.stopReason : 'Thread already resolved.');
  }

  // ── customer.replied ──────────────────────────────────────────────────────
  private async handleReplied(envelope: EventEnvelope): Promise<void> {
    const payload = envelope.payload as unknown as { customerId: string; channel?: string };
    const threads = await this.prisma.followupThread.findMany({
      where: { companyId: envelope.companyId, customerId: payload.customerId, state: { in: ['ACTIVE', 'ESCALATED'] } },
    });
    for (const thread of threads) {
      const transition = reduceThreadOnLifecycle('customer.replied', thread.state as ThreadState);
      if (!transition) continue;
      await this.prisma.followupThread.update({ where: { id: thread.id }, data: { state: transition.state, stopReason: transition.stopReason } });
      await this.timeline.record({ companyId: envelope.companyId, entityType: thread.entityType, entityId: thread.entityId, threadId: thread.id, kind: 'REPLIED', channel: payload.channel ?? null, correlationId: envelope.correlationId, detail: {} });
    }
    await this.recordEngagementSignal(envelope.companyId, payload.customerId, this.toEngagementChannel(payload.channel), 'replied');
    await this.record(envelope, payload.customerId, payload.channel ?? 'IN_APP', 'THREAD_PAUSED', 'NORMAL', `Paused ${threads.length} active thread(s) on customer reply.`);
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private async loadConsent(customerId: string) {
    const rows = await this.prisma.customerContactChannel.findMany({ where: { customerId } });
    const records = rows.map((r) => ({ channel: r.channel as 'WHATSAPP' | 'EMAIL', consentState: r.consentState as ConsentState }));
    const consent = toDunningConsent(records);
    const addresses: Record<string, string | undefined> = {};
    for (const r of rows) addresses[r.channel] = r.address;
    return { ...consent, addresses };
  }

  /** Aggregate the per-channel engagement rows into one snapshot for routing/AI. */
  private async loadEngagement(customerId: string): Promise<EngagementSnapshot | null> {
    const rows = await this.prisma.recipientEngagement.findMany({ where: { customerId } });
    if (rows.length === 0) return null;
    let snap: EngagementSnapshot = { ...EMPTY_ENGAGEMENT };
    for (const r of rows) {
      const channel = r.channel === 'WHATSAPP' || r.channel === 'EMAIL' ? r.channel : undefined;
      snap = {
        ...snap,
        opens: snap.opens + r.opened,
        replies: snap.replies + r.replied,
        paidCount: snap.paidCount + r.paid,
        ignored: snap.ignored + r.ignored,
        blocked: snap.blocked + r.disputed,
        whatsappSignals: snap.whatsappSignals + (channel === 'WHATSAPP' ? r.opened + r.replied + r.paid : 0),
        emailSignals: snap.emailSignals + (channel === 'EMAIL' ? r.opened + r.replied + r.paid : 0),
      };
    }
    return snap;
  }

  /** Rolling 24h send counts per external channel, for the rate limiter. */
  private async rollingCounts(customerId: string): Promise<{ whatsapp: number; email: number }> {
    const since = new Date(Date.now() - ROLLING_WINDOW_MS);
    const grouped = await this.prisma.notificationDelivery.groupBy({
      by: ['channel'],
      where: {
        recipientUserId: customerId,
        createdAt: { gte: since },
        channel: { in: [DeliveryChannel.WHATSAPP, DeliveryChannel.EMAIL] },
        state: { in: [DeliveryState.SENT, DeliveryState.DELIVERED, DeliveryState.READ] },
      },
      _count: { _all: true },
    });
    const count = (c: DeliveryChannel) => grouped.find((g) => g.channel === c)?._count._all ?? 0;
    return { whatsapp: count(DeliveryChannel.WHATSAPP), email: count(DeliveryChannel.EMAIL) };
  }

  private toEngagementChannel(channel?: string): 'WHATSAPP' | 'EMAIL' | null {
    return channel === 'WHATSAPP' || channel === 'EMAIL' ? channel : null;
  }

  /**
   * Increment one engagement counter and recompute the cached reliability score.
   * Order-independent (the score is recomputed from counters, never accumulated).
   */
  private async recordEngagementSignal(
    companyId: string,
    customerId: string,
    channel: 'WHATSAPP' | 'EMAIL' | null,
    field: 'sent' | 'delivered' | 'opened' | 'replied' | 'paid',
  ): Promise<void> {
    const ch = channel ?? 'EMAIL'; // paid/generic signals attach to a stable row
    try {
      const row = await this.prisma.recipientEngagement.upsert({
        where: { customerId_channel: { customerId, channel: ch } },
        update: { [field]: { increment: 1 }, lastSignalAt: new Date() },
        create: { companyId, customerId, channel: ch, [field]: 1, lastSignalAt: new Date() },
      });
      // Recompute the cached reliability from the persisted counters (never
      // accumulated, so replays/backfills can't drift it).
      const reliability = computeReliabilityScore({
        ...EMPTY_ENGAGEMENT,
        opens: row.opened,
        replies: row.replied,
        paidCount: row.paid,
        ignored: row.ignored,
        blocked: row.disputed,
      });
      await this.prisma.recipientEngagement.update({ where: { id: row.id }, data: { reliability } });
    } catch (err) {
      this.logger.warn(`engagement signal skipped (${field}/${customerId}): ${(err as Error).message}`);
    }
  }

  private async record(
    envelope: EventEnvelope,
    recipientUserId: string | null,
    channel: string,
    outcome: Parameters<WorkflowDecisionLogService['record']>[0]['outcome'],
    priority: string,
    reason: string,
  ): Promise<void> {
    await this.decisionLog.record({
      eventId: envelope.eventId,
      correlationId: envelope.correlationId,
      companyId: envelope.companyId,
      eventType: envelope.eventType,
      recipientUserId,
      channel,
      priority,
      outcome,
      reason,
      matchedRule: 'dunning-dispatch',
    });
  }
}

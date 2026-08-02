import { Injectable, Logger } from '@nestjs/common';
import { DeliveryChannel, DeliveryState, RoleName } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { MetricsService } from '@/common/observability/metrics.service';
import { EventConsumer } from '../event-platform/event-bus';
import { EventEnvelope } from '../event-platform/event-envelope';
import {
  NOTIFICATION_RULES,
  NotificationRuleDef,
  isNotifiableEvent,
} from './notification-rules';
import { DecisionOutcome, WorkflowDecisionLogService } from './workflow-decision-log.service';
import { CustomerDispatchService } from './dispatch/customer-dispatch.service';

/** Staff notifications deliver IN_APP; matched rules are the code defaults. */
const CHANNEL = DeliveryChannel.IN_APP;
const MATCHED_RULE = 'code-default';

/**
 * The notification-engine consumer — the keystone every registered event in
 * EVENT_REGISTRY already names as its consumer, but which did not exist until
 * now (Phase 1, Step 2). It turns a domain event into ledgered in-app
 * notifications:
 *
 *   EventBus.publish(envelope)  ->  resolve rule + recipients  ->
 *   (per recipient) create in-app Notification + append NotificationDelivery row
 *
 * At-least-once delivery + idempotency: the relay may re-publish an event, so
 * every write is guarded by the NotificationDelivery unique key
 * (eventId, recipientUserId, channel, attempt). Re-delivery is a no-op.
 *
 * Every decision is recorded (explainability, best-effort) and metered
 * (notification_deliveries_total, notification_engine_duration_seconds).
 *
 * Phase 1 is IN_APP only — no external sends, no customer recipients. Consent,
 * channel routing and dunning arrive in Phase 2 on top of this same path.
 */
@Injectable()
export class WorkflowEngineConsumer implements EventConsumer {
  readonly name = 'notification-engine';
  private readonly logger = new Logger(WorkflowEngineConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly decisionLog: WorkflowDecisionLogService,
    private readonly metrics: MetricsService,
    private readonly customerDispatch: CustomerDispatchService,
  ) {}

  handles(eventType: string): boolean {
    // Staff in-app events (NOTIFICATION_RULES) + customer-dunning lifecycle
    // events both route through this single consumer (the one EVENT_REGISTRY
    // names for all of them).
    return isNotifiableEvent(eventType) || CustomerDispatchService.handles(eventType);
  }

  async handle(envelope: EventEnvelope): Promise<void> {
    const startedNs = process.hrtime.bigint();
    let status: 'success' | 'error' = 'success';
    try {
      // Customer-dunning lifecycle (invoice.dunning-step / invoice.paid /
      // customer.replied) runs the full routing + policy + AI + timeline
      // pipeline; staff notifications keep the IN_APP path below.
      if (CustomerDispatchService.handles(envelope.eventType)) {
        await this.customerDispatch.handle(envelope);
        return;
      }

      const rule = NOTIFICATION_RULES[envelope.eventType];
      if (!rule) return; // handles() gates this; defensive.

      const recipientIds = await this.resolveRecipients(rule, envelope);
      if (recipientIds.length === 0) {
        this.logger.debug(
          `No in-app recipients for ${envelope.eventType} (event ${envelope.eventId}).`,
        );
        await this.recordOutcome(
          envelope,
          rule,
          null,
          'NO_RECIPIENTS',
          'No active users matched the recipient rule.',
        );
        return;
      }

      for (const userId of recipientIds) {
        await this.deliverInApp(envelope, rule, userId);
      }
    } catch (err) {
      status = 'error';
      throw err;
    } finally {
      const seconds = Number(process.hrtime.bigint() - startedNs) / 1e9;
      this.metrics.notificationEngineDuration.observe(
        { event_type: envelope.eventType, status },
        seconds,
      );
    }
  }

  /** Resolve the concrete user ids this event should notify in-app. */
  private async resolveRecipients(
    rule: NotificationRuleDef,
    envelope: EventEnvelope,
  ): Promise<string[]> {
    if (rule.recipient.kind === 'payloadUser') {
      const raw = (envelope.payload as Record<string, unknown>)[rule.recipient.field];
      return typeof raw === 'string' && raw.length > 0 ? [raw] : [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: { name: { in: rule.recipient.roles as RoleName[] } },
        shop: { companyId: envelope.companyId },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /**
   * Create one in-app notification for a recipient and record it on the delivery
   * ledger. Idempotent on the ledger unique key so relay retries never duplicate.
   */
  private async deliverInApp(
    envelope: EventEnvelope,
    rule: NotificationRuleDef,
    recipientUserId: string,
  ): Promise<void> {
    const existing = await this.prisma.notificationDelivery.findUnique({
      where: {
        eventId_recipientUserId_channel_attempt: {
          eventId: envelope.eventId,
          recipientUserId,
          channel: CHANNEL,
          attempt: 1,
        },
      },
      select: { id: true },
    });
    if (existing) {
      // Already delivered for this (event, recipient) — no-op, but explain it.
      await this.recordOutcome(
        envelope,
        rule,
        recipientUserId,
        'SUPPRESSED_DUPLICATE',
        'Already delivered for this (event, recipient); relay retry suppressed.',
      );
      return;
    }

    const rendered = rule.build(envelope.payload as Record<string, unknown>);

    const notification = await this.notifications.create(
      {
        userId: recipientUserId,
        title: rendered.title,
        message: rendered.message,
        type: rendered.alertType,
        priority: rendered.priority,
        module: rule.module,
        referenceType: rendered.referenceType,
        referenceId: rendered.referenceId,
        deepLink: rendered.deepLink,
      },
      envelope.actorId ?? null,
      envelope.companyId,
    );

    await this.prisma.notificationDelivery.create({
      data: {
        eventId: envelope.eventId,
        notificationId: notification.id,
        companyId: envelope.companyId,
        recipientUserId,
        channel: CHANNEL,
        attempt: 1,
        state: DeliveryState.DELIVERED,
        classification: envelope.classification,
        correlationId: envelope.correlationId,
      },
    });

    await this.recordOutcome(
      envelope,
      rule,
      recipientUserId,
      'DELIVERED',
      `In-app notification created (${rendered.alertType}).`,
      rendered.priority,
    );
  }

  /** Meter the outcome and append the explainability decision-log row (best-effort). */
  private async recordOutcome(
    envelope: EventEnvelope,
    rule: NotificationRuleDef,
    recipientUserId: string | null,
    outcome: DecisionOutcome,
    reason: string,
    priority?: string,
  ): Promise<void> {
    const resolvedPriority =
      priority ?? rule.build(envelope.payload as Record<string, unknown>).priority;

    this.metrics.notificationDeliveries.inc({ channel: CHANNEL, outcome });

    await this.decisionLog.record({
      eventId: envelope.eventId,
      correlationId: envelope.correlationId,
      companyId: envelope.companyId,
      eventType: envelope.eventType,
      recipientUserId,
      channel: CHANNEL,
      priority: resolvedPriority,
      outcome,
      reason,
      matchedRule: MATCHED_RULE,
    });
  }
}

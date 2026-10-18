import { Injectable, Logger } from '@nestjs/common';
import { DeliveryState } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TimelineService, TimelineKind } from '../analytics/timeline.service';

/**
 * Provider delivery-status ingestion (Plan §11 "Status Update"). A provider
 * (WhatsApp/Email) reports delivered/read/failed for a message it accepted; this
 * maps the `providerMessageId` back to its {@link NotificationDelivery} row and
 * advances the ledger state, closing the loop the plan's dispatch diagram shows
 * (…Adapter → Webhook → Status Update).
 *
 * Idempotent and safe: an unknown providerMessageId is ignored; the state only
 * moves forward (READ never regresses to DELIVERED).
 */
const STATE_RANK: Record<string, number> = {
  [DeliveryState.CREATED]: 0,
  [DeliveryState.QUEUED]: 1,
  [DeliveryState.DISPATCHING]: 2,
  [DeliveryState.SENT]: 3,
  [DeliveryState.DELIVERED]: 4,
  [DeliveryState.READ]: 5,
  [DeliveryState.ACKNOWLEDGED]: 6,
  [DeliveryState.FAILED]: 3,
};

const STATUS_MAP: Record<string, DeliveryState> = {
  sent: DeliveryState.SENT,
  delivered: DeliveryState.DELIVERED,
  read: DeliveryState.READ,
  failed: DeliveryState.FAILED,
};

@Injectable()
export class DeliveryStatusService {
  private readonly logger = new Logger(DeliveryStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  /** Apply a provider status. Returns true if a matching delivery was updated. */
  async apply(providerMessageId: string, status: string, companyId?: string): Promise<boolean> {
    const next = STATUS_MAP[status.toLowerCase()];
    if (!next) return false;

    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: { providerMessageId, ...(companyId ? { companyId } : {}) },
    });
    if (!delivery) return false;

    // Only advance forward (a late "delivered" must not overwrite "read").
    if (STATE_RANK[next] < STATE_RANK[delivery.state] && next !== DeliveryState.FAILED) {
      return true;
    }

    await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { state: next } });

    const kind: TimelineKind | null =
      next === DeliveryState.DELIVERED ? 'DELIVERED' : next === DeliveryState.READ ? 'READ' : null;
    if (kind) {
      await this.timeline.record({
        companyId: delivery.companyId,
        entityType: 'invoice',
        entityId: delivery.recipientUserId, // best-effort; delivery is keyed by event not invoice
        kind,
        channel: delivery.channel,
        correlationId: delivery.correlationId,
        detail: { providerMessageId },
      });
    }
    this.logger.debug(`Delivery ${delivery.id} → ${next} (provider ${providerMessageId}).`);
    return true;
  }
}

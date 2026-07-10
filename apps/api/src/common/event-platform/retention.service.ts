import { Injectable, Logger } from '@nestjs/common';
import { EventClassification, OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Retention windows. See docs/event-platform/retention-and-versioning.md. */
export const OUTBOX_RETENTION_DAYS = 90; // ACKNOWLEDGED only
export const DELIVERY_RETENTION_DAYS = 365;

/** Delivery classes pinned to permanent retention (never purged). */
const PERMANENT_CLASSES: EventClassification[] = [
  EventClassification.SECURITY,
  EventClassification.COMPLIANCE,
];

export interface RetentionResult {
  outboxDeleted: number;
  deliveriesDeleted: number;
}

/**
 * TTL cleanup for the event platform. Only removes terminal, non-permanent
 * rows strictly older than their window; never touches in-flight work
 * (PENDING/FAILED/DEAD outbox, or non-terminal deliveries are left by age only).
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async cleanup(now: Date = new Date()): Promise<RetentionResult> {
    const outboxCutoff = new Date(now.getTime() - OUTBOX_RETENTION_DAYS * DAY_MS);
    const deliveryCutoff = new Date(now.getTime() - DELIVERY_RETENTION_DAYS * DAY_MS);

    const outbox = await this.prisma.outboxEvent.deleteMany({
      where: { status: OutboxStatus.ACKNOWLEDGED, createdAt: { lt: outboxCutoff } },
    });

    const deliveries = await this.prisma.notificationDelivery.deleteMany({
      where: {
        createdAt: { lt: deliveryCutoff },
        classification: { notIn: PERMANENT_CLASSES },
      },
    });

    if (outbox.count || deliveries.count) {
      this.logger.log(
        `Retention cleanup: removed ${outbox.count} outbox events, ${deliveries.count} deliveries.`,
      );
    }
    return { outboxDeleted: outbox.count, deliveriesDeleted: deliveries.count };
  }
}

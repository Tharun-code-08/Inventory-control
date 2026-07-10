import { Injectable, Logger } from '@nestjs/common';
import { OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBus } from './event-bus';
import { EventEnvelope, EventClassification } from './event-envelope';

/** Max publish attempts before an event is parked as DEAD. */
export const MAX_RELAY_ATTEMPTS = 6;
/** How many events one tick claims. */
export const RELAY_BATCH_SIZE = 50;

interface OutboxRow {
  id: string;
  event_id: string;
  event_type: string;
  event_version: number;
  aggregate_type: string;
  aggregate_id: string;
  company_id: string;
  classification: EventClassification;
  payload: Record<string, unknown>;
  correlation_id: string;
  causation_id: string | null;
  trace_id: string | null;
  span_id: string | null;
  actor_id: string | null;
  retry_count: number;
  created_at: Date;
}

export interface RelayTickResult {
  claimed: number;
  published: number;
  failed: number;
  dead: number;
}

/** Exponential backoff (seconds) capped at 10 minutes. */
function backoffSeconds(retryCount: number): number {
  return Math.min(600, Math.pow(2, retryCount));
}

function rowToEnvelope(row: OutboxRow): EventEnvelope {
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    companyId: row.company_id,
    occurredAt: row.created_at,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    traceId: row.trace_id,
    spanId: row.span_id,
    actorId: row.actor_id,
    classification: row.classification,
    payload: row.payload,
  };
}

/**
 * Polls the outbox and publishes PENDING (and retry-eligible FAILED) events to
 * the in-process bus. Rows are claimed with FOR UPDATE SKIP LOCKED inside a
 * transaction, so concurrent relay instances never double-process a row, and a
 * crash mid-batch rolls the claim back (events return to PENDING).
 *
 * Driven by a BullMQ repeatable job (see event-relay.processor.ts) rather than
 * @nestjs/schedule, matching this codebase's scheduling convention.
 */
@Injectable()
export class EventRelayService {
  private readonly logger = new Logger(EventRelayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
  ) {}

  async tick(batchSize: number = RELAY_BATCH_SIZE): Promise<RelayTickResult> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>(Prisma.sql`
        SELECT * FROM outbox_events
        WHERE status = 'PENDING'
           OR (status = 'FAILED' AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
        ORDER BY created_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `);

      const result: RelayTickResult = { claimed: rows.length, published: 0, failed: 0, dead: 0 };

      for (const row of rows) {
        try {
          await this.bus.publish(rowToEnvelope(row));
          await tx.outboxEvent.update({
            where: { id: row.id },
            data: { status: OutboxStatus.ACKNOWLEDGED, publishedAt: new Date(), lastError: null },
          });
          result.published += 1;
        } catch (err) {
          const retryCount = row.retry_count + 1;
          const isDead = retryCount >= MAX_RELAY_ATTEMPTS;
          const message = err instanceof Error ? err.message : String(err);
          await tx.outboxEvent.update({
            where: { id: row.id },
            data: {
              status: isDead ? OutboxStatus.DEAD : OutboxStatus.FAILED,
              retryCount,
              lastError: message.slice(0, 1000),
              nextAttemptAt: isDead
                ? null
                : new Date(Date.now() + backoffSeconds(retryCount) * 1000),
            },
          });
          if (isDead) {
            result.dead += 1;
            this.logger.error(
              `Outbox event ${row.event_id} (${row.event_type}) is DEAD after ${retryCount} attempts: ${message}`,
            );
          } else {
            result.failed += 1;
          }
        }
      }

      return result;
    });
  }

  /**
   * Re-drive a DEAD (or already-ACKNOWLEDGED) event: reset it to PENDING so the
   * next tick republishes it. Logged as a REPLAYED transition. Consumers dedup
   * on eventId, so replay is safe.
   */
  async replay(eventId: string): Promise<boolean> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { eventId } });
    if (!event) return false;
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        nextAttemptAt: null,
        lastError: null,
      },
    });
    this.logger.warn(`Replayed outbox event ${eventId} (${event.eventType}); reset to PENDING.`);
    return true;
  }
}

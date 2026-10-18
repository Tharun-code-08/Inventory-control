import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBus } from '../../event-platform/event-bus';
import { EventEnvelope } from '../../event-platform/event-envelope';

/**
 * Event replay (Plan §10 "Event Replay"). Re-publishes stored outbox events —
 * by correlation id or event id — back onto the {@link EventBus} for debugging
 * and recovery. Consumers are idempotent (they dedup on eventId), so replay is
 * safe: it re-drives decision logic without duplicating side effects that are
 * already keyed by eventId.
 */
@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
  ) {}

  /** Replay every event sharing a correlation id, in original order. */
  async replayByCorrelation(companyId: string, correlationId: string): Promise<number> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: { companyId, correlationId },
      orderBy: { createdAt: 'asc' },
    });
    return this.replayRows(rows);
  }

  /** Replay a single event by its id. */
  async replayOne(companyId: string, eventId: string): Promise<boolean> {
    const row = await this.prisma.outboxEvent.findFirst({ where: { companyId, eventId } });
    if (!row) return false;
    await this.replayRows([row]);
    return true;
  }

  private async replayRows(rows: Awaited<ReturnType<PrismaService['outboxEvent']['findMany']>>): Promise<number> {
    let replayed = 0;
    for (const row of rows) {
      const envelope: EventEnvelope = {
        eventId: row.eventId,
        eventType: row.eventType,
        eventVersion: row.eventVersion,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        companyId: row.companyId,
        occurredAt: row.createdAt,
        correlationId: row.correlationId,
        causationId: row.causationId,
        traceId: row.traceId,
        spanId: row.spanId,
        actorId: row.actorId,
        classification: row.classification,
        payload: row.payload as Record<string, unknown>,
      };
      await this.bus.publish(envelope);
      replayed += 1;
    }
    this.logger.log(`Replayed ${replayed} event(s).`);
    return replayed;
  }
}

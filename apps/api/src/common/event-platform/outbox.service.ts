import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { OutboxStatus, Prisma } from '@prisma/client';
import { RequestContextStore } from '../context/request-context';
import { DomainEventInput } from './event-envelope';
import { assertRegisteredAndValid } from './schema-registry';

/**
 * Transactional outbox writer. Call inside the caller's `$transaction` so the
 * business change and its event commit atomically. Validates against the
 * Schema + Ownership Registry BEFORE writing — a malformed/unregistered event
 * throws and rolls back the caller's transaction.
 *
 * See docs/event-platform/ADR.md (Decision 3) and schema-registry.md.
 */
@Injectable()
export class OutboxService {
  /**
   * @param tx  The caller's Prisma transaction client. Passing the non-tx
   *            client works but forfeits atomicity — always pass the tx client.
   */
  async emit(tx: Prisma.TransactionClient, input: DomainEventInput): Promise<string> {
    const entry = assertRegisteredAndValid(input.eventType, input.eventVersion, input.payload);
    const eventId = input.eventId ?? randomUUID();

    // Resolve correlation/trace/actor from the request context when the producer
    // did not pass them, so a flow is traceable end-to-end without boilerplate.
    const ctx = RequestContextStore.get();
    const correlationId = input.correlationId ?? ctx?.requestId ?? randomUUID();

    await tx.outboxEvent.create({
      data: {
        eventId,
        eventType: input.eventType,
        eventVersion: input.eventVersion,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        companyId: input.companyId,
        classification: entry.classification,
        payload: input.payload as Prisma.InputJsonValue,
        correlationId,
        causationId: input.causationId ?? null,
        traceId: input.traceId ?? ctx?.traceparent ?? null,
        spanId: input.spanId ?? null,
        actorId: input.actorId ?? ctx?.userId ?? null,
        status: OutboxStatus.PENDING,
      },
    });

    return eventId;
  }
}

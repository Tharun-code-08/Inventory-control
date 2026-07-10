import { EventClassification } from '@prisma/client';

export { EventClassification };

/**
 * The immutable envelope every domain event carries on the platform.
 * See docs/event-platform/event-envelope.md. Only `payload` varies per
 * `eventType@eventVersion`; the envelope shape is fixed.
 */
export interface EventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  companyId: string;
  occurredAt: Date;
  correlationId: string;
  causationId?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  actorId?: string | null;
  classification: EventClassification;
  payload: TPayload;
}

/**
 * What a producer supplies to OutboxService.emit. The envelope's derived fields
 * (eventId, occurredAt, classification) and validation are filled/enforced by
 * the outbox from the registry, so producers cannot forge them inconsistently.
 */
export interface DomainEventInput<TPayload = Record<string, unknown>> {
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  companyId: string;
  payload: TPayload;
  /**
   * Ties all events in one business flow together. Optional: when omitted it is
   * resolved from the request context (the request id), so most producers need
   * not pass it.
   */
  correlationId?: string;
  /** Optional causal + trace linkage, propagated when known. */
  causationId?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  actorId?: string | null;
  /** Explicit eventId for idempotent producers; otherwise generated. */
  eventId?: string;
}

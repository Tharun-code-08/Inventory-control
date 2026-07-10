import { EventClassification, OutboxStatus, Prisma } from '@prisma/client';
import { EventBus, EventConsumer } from './event-bus';
import { EventEnvelope } from './event-envelope';
import { OutboxService } from './outbox.service';
import { EventRelayService, MAX_RELAY_ATTEMPTS } from './event-relay.service';
import {
  assertRegisteredAndValid,
  EventContractViolationError,
  validatePayload,
} from './schema-registry';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const validPoPayload = {
  purchaseOrderId: VALID_UUID,
  poNumber: 'PO-1',
  supplierId: VALID_UUID,
  supplierName: 'Acme',
  totalAmount: 100,
  createdBy: VALID_UUID,
};

describe('schema registry', () => {
  it('rejects an unregistered event', () => {
    expect(() => assertRegisteredAndValid('not.a-real-event', 1, {})).toThrow(
      EventContractViolationError,
    );
  });

  it('rejects a malformed payload (missing required + wrong type)', () => {
    expect(() =>
      assertRegisteredAndValid('purchase-order.created', 1, {
        ...validPoPayload,
        totalAmount: 'lots', // wrong type
        supplierId: undefined, // missing required
      }),
    ).toThrow(EventContractViolationError);
  });

  it('accepts a valid payload and returns the registry entry', () => {
    const entry = assertRegisteredAndValid('purchase-order.created', 1, validPoPayload);
    expect(entry.classification).toBe(EventClassification.OPERATIONAL);
    expect(entry.ownerModule).toBe('purchase-orders');
  });

  it('validatePayload flags uuid and optional fields correctly', () => {
    const errors = validatePayload({ a: { type: 'uuid' }, b: { type: 'string', optional: true } }, {
      a: 'not-a-uuid',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('uuid');
  });
});

describe('OutboxService.emit', () => {
  const service = new OutboxService();

  function buildTx() {
    return {
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as Prisma.TransactionClient;
  }

  it('writes a PENDING row with a generated eventId inside the caller tx', async () => {
    const tx = buildTx();
    const eventId = await service.emit(tx, {
      eventType: 'purchase-order.created',
      eventVersion: 1,
      aggregateType: 'PurchaseOrder',
      aggregateId: VALID_UUID,
      companyId: VALID_UUID,
      correlationId: VALID_UUID,
      payload: validPoPayload,
    });
    expect(eventId).toMatch(/[0-9a-f-]{36}/);
    const create = (tx.outboxEvent.create as jest.Mock).mock.calls[0][0];
    expect(create.data.status).toBe(OutboxStatus.PENDING);
    expect(create.data.classification).toBe(EventClassification.OPERATIONAL);
    expect(create.data.eventId).toBe(eventId);
  });

  it('throws (rolling back the tx) and never writes on an invalid event', async () => {
    const tx = buildTx();
    await expect(
      service.emit(tx, {
        eventType: 'purchase-order.created',
        eventVersion: 1,
        aggregateType: 'PurchaseOrder',
        aggregateId: VALID_UUID,
        companyId: VALID_UUID,
        correlationId: VALID_UUID,
        payload: { poNumber: 'PO-1' }, // missing required fields
      }),
    ).rejects.toBeInstanceOf(EventContractViolationError);
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
  });
});

describe('EventBus', () => {
  function consumer(name: string, handles: (t: string) => boolean, handle = jest.fn()): EventConsumer {
    return { name, handles, handle };
  }
  const envelope: EventEnvelope = {
    eventId: VALID_UUID,
    eventType: 'purchase-order.created',
    eventVersion: 1,
    aggregateType: 'PurchaseOrder',
    aggregateId: VALID_UUID,
    companyId: VALID_UUID,
    occurredAt: new Date(),
    correlationId: VALID_UUID,
    classification: EventClassification.OPERATIONAL,
    payload: validPoPayload,
  };

  it('dispatches only to matching consumers', async () => {
    const bus = new EventBus();
    const match = consumer('match', () => true);
    const skip = consumer('skip', () => false);
    bus.register(match);
    bus.register(skip);
    await bus.publish(envelope);
    expect(match.handle).toHaveBeenCalledWith(envelope);
    expect(skip.handle).not.toHaveBeenCalled();
  });

  it('ignores a duplicate consumer registration', async () => {
    const bus = new EventBus();
    const handle = jest.fn();
    bus.register(consumer('dup', () => true, handle));
    bus.register(consumer('dup', () => true, jest.fn()));
    await bus.publish(envelope);
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('propagates a consumer error to the caller (relay marks FAILED)', async () => {
    const bus = new EventBus();
    bus.register(
      consumer('boom', () => true, jest.fn().mockRejectedValue(new Error('kaboom'))),
    );
    await expect(bus.publish(envelope)).rejects.toThrow('kaboom');
  });
});

describe('EventRelayService', () => {
  const baseRow = {
    id: 'row-1',
    event_id: VALID_UUID,
    event_type: 'purchase-order.created',
    event_version: 1,
    aggregate_type: 'PurchaseOrder',
    aggregate_id: VALID_UUID,
    company_id: VALID_UUID,
    classification: EventClassification.OPERATIONAL,
    payload: validPoPayload,
    correlation_id: VALID_UUID,
    causation_id: null,
    trace_id: null,
    span_id: null,
    actor_id: null,
    retry_count: 0,
    created_at: new Date(),
  };

  function buildPrisma(rows: unknown[]) {
    const update = jest.fn().mockResolvedValue({});
    const tx = { $queryRaw: jest.fn().mockResolvedValue(rows), outboxEvent: { update } };
    const prisma = {
      $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
      outboxEvent: { findUnique: jest.fn(), update: jest.fn() },
    };
    return { prisma, update };
  }

  it('publishes a claimed event and marks it ACKNOWLEDGED', async () => {
    const { prisma, update } = buildPrisma([baseRow]);
    const bus = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as EventBus;
    const relay = new EventRelayService(prisma as never, bus);
    const result = await relay.tick();
    expect(result).toMatchObject({ claimed: 1, published: 1, failed: 0, dead: 0 });
    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: VALID_UUID, eventType: 'purchase-order.created' }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.ACKNOWLEDGED }) }),
    );
  });

  it('marks FAILED with backoff when a consumer throws (below max attempts)', async () => {
    const { prisma, update } = buildPrisma([{ ...baseRow, retry_count: 1 }]);
    const bus = { publish: jest.fn().mockRejectedValue(new Error('down')) } as unknown as EventBus;
    const relay = new EventRelayService(prisma as never, bus);
    const result = await relay.tick();
    expect(result).toMatchObject({ failed: 1, dead: 0 });
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe(OutboxStatus.FAILED);
    expect(data.retryCount).toBe(2);
    expect(data.nextAttemptAt).toBeInstanceOf(Date);
  });

  it('marks DEAD once retries are exhausted', async () => {
    const { prisma, update } = buildPrisma([{ ...baseRow, retry_count: MAX_RELAY_ATTEMPTS - 1 }]);
    const bus = { publish: jest.fn().mockRejectedValue(new Error('down')) } as unknown as EventBus;
    const relay = new EventRelayService(prisma as never, bus);
    const result = await relay.tick();
    expect(result).toMatchObject({ dead: 1 });
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe(OutboxStatus.DEAD);
    expect(data.nextAttemptAt).toBeNull();
  });

  it('replay resets a known event to PENDING', async () => {
    const { prisma } = buildPrisma([]);
    (prisma.outboxEvent.findUnique as jest.Mock).mockResolvedValue({
      eventId: VALID_UUID,
      eventType: 'purchase-order.created',
    });
    (prisma.outboxEvent.update as jest.Mock).mockResolvedValue({});
    const relay = new EventRelayService(prisma as never, {} as EventBus);
    await expect(relay.replay(VALID_UUID)).resolves.toBe(true);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.PENDING, retryCount: 0 }) }),
    );
  });

  it('replay returns false for an unknown event', async () => {
    const { prisma } = buildPrisma([]);
    (prisma.outboxEvent.findUnique as jest.Mock).mockResolvedValue(null);
    const relay = new EventRelayService(prisma as never, {} as EventBus);
    await expect(relay.replay('missing')).resolves.toBe(false);
  });
});

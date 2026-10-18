import { EventClassification, DeliveryChannel, DeliveryState } from '@prisma/client';
import { WorkflowEngineConsumer } from './workflow-engine.consumer';
import { EventEnvelope } from '../event-platform/event-envelope';

type PrismaMock = {
  user: { findMany: jest.Mock };
  notificationDelivery: { findUnique: jest.Mock; create: jest.Mock };
};

const buildEnvelope = (overrides: Partial<EventEnvelope> = {}): EventEnvelope => ({
  eventId: 'evt-1',
  eventType: 'goods-receipt.created',
  eventVersion: 1,
  aggregateType: 'goods-receipt',
  aggregateId: 'gr-1',
  companyId: 'company-1',
  occurredAt: new Date(),
  correlationId: 'corr-1',
  classification: EventClassification.OPERATIONAL,
  payload: { grNumber: 'GR-100', supplierName: 'Acme', goodsReceiptId: 'gr-1' },
  ...overrides,
});

const buildHarness = () => {
  const prisma: PrismaMock = {
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-a' }, { id: 'user-b' }]) },
    notificationDelivery: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'del-1' }),
    },
  };
  const notifications = { create: jest.fn().mockResolvedValue({ id: 'notif-1' }) };
  const decisionLog = { record: jest.fn().mockResolvedValue(undefined) };
  const metrics = {
    notificationDeliveries: { inc: jest.fn() },
    notificationEngineDuration: { observe: jest.fn() },
  };
  const customerDispatch = { handle: jest.fn().mockResolvedValue(undefined) };
  const consumer = new WorkflowEngineConsumer(
    prisma as never,
    notifications as never,
    decisionLog as never,
    metrics as never,
    customerDispatch as never,
  );
  return { consumer, prisma, notifications, decisionLog, metrics, customerDispatch };
};

describe('WorkflowEngineConsumer', () => {
  it('is named notification-engine and handles registered event types', () => {
    const { consumer } = buildHarness();
    expect(consumer.name).toBe('notification-engine');
    expect(consumer.handles('goods-receipt.created')).toBe(true);
    expect(consumer.handles('auth.otp-requested')).toBe(false); // security → not in-app
    expect(consumer.handles('unknown.event')).toBe(false);
    // Customer-dunning lifecycle events now route through the same consumer.
    expect(consumer.handles('invoice.dunning-step')).toBe(true);
    expect(consumer.handles('invoice.paid')).toBe(true);
    expect(consumer.handles('customer.replied')).toBe(true);
  });

  it('delegates customer-dunning events to the dispatch pipeline (not the in-app path)', async () => {
    const { consumer, customerDispatch, notifications } = buildHarness();
    const envelope = buildEnvelope({ eventType: 'invoice.dunning-step' });

    await consumer.handle(envelope);

    expect(customerDispatch.handle).toHaveBeenCalledWith(envelope);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('fans a role-based event out to every matching user with a ledger row each', async () => {
    const { consumer, prisma, notifications, decisionLog, metrics } = buildHarness();

    await consumer.handle(buildEnvelope());

    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(prisma.notificationDelivery.create).toHaveBeenCalledTimes(2);
    const firstLedger = prisma.notificationDelivery.create.mock.calls[0][0].data;
    expect(firstLedger).toMatchObject({
      eventId: 'evt-1',
      companyId: 'company-1',
      channel: DeliveryChannel.IN_APP,
      state: DeliveryState.DELIVERED,
      classification: EventClassification.OPERATIONAL,
      correlationId: 'corr-1',
      notificationId: 'notif-1',
    });

    // Explainability + metrics: one DELIVERED decision per recipient.
    expect(decisionLog.record).toHaveBeenCalledTimes(2);
    expect(decisionLog.record.mock.calls[0][0]).toMatchObject({
      eventId: 'evt-1',
      outcome: 'DELIVERED',
      channel: DeliveryChannel.IN_APP,
      matchedRule: 'code-default',
    });
    expect(metrics.notificationDeliveries.inc).toHaveBeenCalledWith({
      channel: DeliveryChannel.IN_APP,
      outcome: 'DELIVERED',
    });
    expect(metrics.notificationEngineDuration.observe).toHaveBeenCalledWith(
      { event_type: 'goods-receipt.created', status: 'success' },
      expect.any(Number),
    );
  });

  it('records NO_RECIPIENTS when no user matches the rule', async () => {
    const { consumer, prisma, notifications, decisionLog, metrics } = buildHarness();
    prisma.user.findMany.mockResolvedValue([]);

    await consumer.handle(buildEnvelope());

    expect(notifications.create).not.toHaveBeenCalled();
    expect(decisionLog.record).toHaveBeenCalledTimes(1);
    expect(decisionLog.record.mock.calls[0][0]).toMatchObject({
      outcome: 'NO_RECIPIENTS',
      recipientUserId: null,
    });
    expect(metrics.notificationDeliveries.inc).toHaveBeenCalledWith({
      channel: DeliveryChannel.IN_APP,
      outcome: 'NO_RECIPIENTS',
    });
  });

  it('targets the single payload user for approval events', async () => {
    const { consumer, prisma, notifications } = buildHarness();

    await consumer.handle(
      buildEnvelope({
        eventType: 'approval.requested',
        payload: { approvalId: 'a-1', approvalType: 'PO', assignedToUserId: 'approver-1' },
      }),
    );

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create.mock.calls[0][0].userId).toBe('approver-1');
  });

  it('is idempotent — an already-delivered (event, recipient) is a no-op', async () => {
    const { consumer, prisma, notifications, decisionLog, metrics } = buildHarness();
    prisma.user.findMany.mockResolvedValue([{ id: 'user-a' }]);
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'existing' });

    await consumer.handle(buildEnvelope());

    expect(notifications.create).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.create).not.toHaveBeenCalled();
    expect(decisionLog.record.mock.calls[0][0]).toMatchObject({
      outcome: 'SUPPRESSED_DUPLICATE',
    });
    expect(metrics.notificationDeliveries.inc).toHaveBeenCalledWith({
      channel: DeliveryChannel.IN_APP,
      outcome: 'SUPPRESSED_DUPLICATE',
    });
  });
});

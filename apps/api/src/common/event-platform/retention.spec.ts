import { EventClassification, OutboxStatus } from '@prisma/client';
import { RetentionService } from './retention.service';

describe('RetentionService.cleanup', () => {
  function build() {
    const prisma = {
      outboxEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      notificationDelivery: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
    };
    return { service: new RetentionService(prisma as never), prisma };
  }

  it('purges only ACKNOWLEDGED outbox events older than the window', async () => {
    const { service, prisma } = build();
    await service.cleanup();
    const where = prisma.outboxEvent.deleteMany.mock.calls[0][0].where;
    expect(where.status).toBe(OutboxStatus.ACKNOWLEDGED);
    expect(where.createdAt.lt).toBeInstanceOf(Date);
  });

  it('excludes SECURITY and COMPLIANCE deliveries from purge (permanent classes)', async () => {
    const { service, prisma } = build();
    const result = await service.cleanup();
    const where = prisma.notificationDelivery.deleteMany.mock.calls[0][0].where;
    expect(where.classification.notIn).toEqual([
      EventClassification.SECURITY,
      EventClassification.COMPLIANCE,
    ]);
    expect(result).toEqual({ outboxDeleted: 3, deliveriesDeleted: 5 });
  });
});

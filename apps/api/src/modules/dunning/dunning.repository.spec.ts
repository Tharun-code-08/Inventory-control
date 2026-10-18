import { DunningRepository } from './dunning.repository';

const buildPrisma = (over: Record<string, unknown> = {}) => ({
  invoiceHeader: { findMany: jest.fn().mockResolvedValue([]) },
  followupThread: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
  customerContactChannel: { findMany: jest.fn().mockResolvedValue([]) },
  ...over,
});

describe('DunningRepository.loadCandidates', () => {
  it('maps invoice + consent + thread into a DunningCandidate', async () => {
    const prisma = buildPrisma({
      invoiceHeader: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inv-1',
            invoiceNumber: 'INV-1',
            customerId: 'cust-1',
            status: 'PARTIALLY_PAID',
            dueDate: new Date('2026-08-01'),
            totalValue: 1000,
            paidValue: 250,
            shop: { companyId: 'co-1' },
          },
        ]),
      },
      followupThread: {
        findMany: jest.fn().mockResolvedValue([{ entityId: 'inv-1', ladderStep: 1, state: 'ACTIVE' }]),
        upsert: jest.fn(),
      },
      customerContactChannel: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ customerId: 'cust-1', channel: 'WHATSAPP', consentState: 'OPTED_IN' }]),
      },
    });
    const repo = new DunningRepository(prisma as never);

    const [c] = await repo.loadCandidates();

    expect(c).toMatchObject({
      invoiceId: 'inv-1',
      companyId: 'co-1',
      customerId: 'cust-1',
      balanceDue: 750, // 1000 - 250
      invoiceStatus: 'PARTIALLY_PAID',
      consent: { whatsapp: true, email: false },
      thread: { ladderStep: 1, state: 'ACTIVE' },
    });
  });

  it('drops invoices whose shop has no company', async () => {
    const prisma = buildPrisma({
      invoiceHeader: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inv-2',
            invoiceNumber: 'INV-2',
            customerId: 'cust-2',
            status: 'ISSUED',
            dueDate: new Date('2026-08-01'),
            totalValue: 500,
            paidValue: 0,
            shop: { companyId: null },
          },
        ]),
      },
    });
    const repo = new DunningRepository(prisma as never);
    expect(await repo.loadCandidates()).toHaveLength(0);
  });
});

describe('DunningRepository.saveThreadOps', () => {
  it('upserts each thread op on (entityType, entityId)', async () => {
    const tx = { followupThread: { upsert: jest.fn() } };
    const repo = new DunningRepository(buildPrisma() as never);

    await repo.saveThreadOps(tx as never, [
      {
        invoiceId: 'inv-1',
        companyId: 'co-1',
        customerId: 'cust-1',
        ladderStep: 0,
        state: 'ACTIVE',
        nextActionAt: new Date('2026-08-01'),
      },
    ]);

    expect(tx.followupThread.upsert).toHaveBeenCalledTimes(1);
    const arg = tx.followupThread.upsert.mock.calls[0][0];
    expect(arg.where.entityType_entityId).toEqual({ entityType: 'invoice', entityId: 'inv-1' });
    expect(arg.create).toMatchObject({ ladderStep: 0, state: 'ACTIVE', companyId: 'co-1' });
    expect(arg.update).toMatchObject({ ladderStep: 0, state: 'ACTIVE' });
  });
});

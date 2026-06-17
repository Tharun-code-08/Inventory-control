import { DocumentStatus, Prisma, RoleName, TransactionType } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { GoodsIssuesService } from './goods-issues.service';

const orgAdmin: RequestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: 'shop-1',
  companyId: 'co-1',
  tenantShopIds: ['shop-1', 'shop-2'],
  permissions: [],
};

function buildTx(overrides: Record<string, unknown> = {}) {
  return {
    goodsIssueHeader: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    product: { findUnique: jest.fn() },
    stockSummary: {
      findUnique: jest.fn().mockResolvedValue({ currentStock: new Prisma.Decimal(10) }),
    },
    ...overrides,
  };
}

function makeService(tx: ReturnType<typeof buildTx>) {
  const prisma = {
    goodsIssueHeader: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  } as any;

  const stock = {
    postMovementOnce: jest.fn(),
    resolveBalance: jest.fn().mockResolvedValue(new Prisma.Decimal(10)),
  } as any;
  const numbers = {
    nextConfiguredShopScopedNumber: jest.fn().mockResolvedValue('GI-202605-00001'),
  } as any;
  const audit = { log: jest.fn(), logTenant: jest.fn(), logPlatform: jest.fn() } as any;
  const inventoryLots = { consumeFifo: jest.fn() } as any;

  const notifications = { create: jest.fn() } as any;
  const service = new GoodsIssuesService(prisma, stock, numbers, audit, inventoryLots, notifications);
  return { service, prisma, tx, stock, audit, inventoryLots, notifications };
}

describe('GoodsIssuesService', () => {
  it('lists goods issues newest first with serialized item counts', async () => {
    const tx = buildTx();
    const { service, prisma } = makeService(tx);
    const createdAt = new Date('2026-05-26T10:00:00.000Z');
    prisma.goodsIssueHeader.findMany.mockResolvedValue([
      {
        id: 'gi-new',
        giNumber: 'GI-202605-00002',
        giDate: new Date('2026-05-26T00:00:00.000Z'),
        shopId: 'shop-1',
        issueReason: 'Sales Order',
        remarks: null,
        status: DocumentStatus.DRAFT,
        postedAt: null,
        createdAt,
        updatedAt: createdAt,
        shop: { id: 'shop-1', shopName: 'Main Plant', shopNumber: 'HQ-001' },
        _count: { items: 2 },
      },
    ]);

    const result = await service.list(orgAdmin, { take: 100 });

    expect(prisma.goodsIssueHeader.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          shop: true,
          _count: { select: { items: true } },
        },
      }),
    );
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'gi-new',
        giNumber: 'GI-202605-00002',
        giDate: '2026-05-26',
        itemCount: 2,
        shop: expect.objectContaining({ shopName: 'Main Plant' }),
      }),
    ]);
  });

  it('creates a draft goods issue and returns it from list scope', async () => {
    const tx = buildTx();
    const { service, prisma, tx: transaction } = makeService(tx);
    const createdAt = new Date('2026-05-26T10:00:00.000Z');
    transaction.goodsIssueHeader.create.mockResolvedValue({
      id: 'gi-1',
      giNumber: 'GI-202605-00001',
      giDate: new Date('2026-05-26T00:00:00.000Z'),
      shopId: 'shop-1',
      issueReason: 'Sales Order',
      remarks: null,
      status: DocumentStatus.DRAFT,
      items: [],
      shop: { id: 'shop-1', shopName: 'Main Plant' },
    });
    prisma.goodsIssueHeader.findMany.mockResolvedValue([
      {
        id: 'gi-1',
        giNumber: 'GI-202605-00001',
        giDate: new Date('2026-05-26T00:00:00.000Z'),
        shopId: 'shop-1',
        issueReason: 'Sales Order',
        remarks: null,
        status: DocumentStatus.DRAFT,
        postedAt: null,
        createdAt,
        updatedAt: createdAt,
        shop: { id: 'shop-1', shopName: 'Main Plant', shopNumber: 'HQ-001' },
        _count: { items: 1 },
      },
    ]);

    await service.create(orgAdmin, {
      giDate: '2026-05-26',
      shopId: 'shop-1',
      issueReason: 'Sales Order',
      items: [{ productId: 'prod-1', quantity: 2, uom: 'pcs' }],
    });
    const listed = await service.list(orgAdmin, { take: 100 });

    expect(transaction.goodsIssueHeader.create).toHaveBeenCalled();
    expect(listed.data[0]).toEqual(
      expect.objectContaining({
        id: 'gi-1',
        status: DocumentStatus.DRAFT,
        itemCount: 1,
      }),
    );
  });

  it('posts a draft goods issue and records stock movement once', async () => {
    const tx = buildTx();
    const { service, tx: transaction, stock, audit, inventoryLots } = makeService(tx);
    const header = {
      id: 'gi-1',
      giNumber: 'GI-202605-00001',
      giDate: new Date('2026-05-26T00:00:00.000Z'),
      shopId: 'shop-1',
      status: DocumentStatus.DRAFT,
    };

    jest.spyOn(service, 'get').mockResolvedValue(header as never);
    transaction.goodsIssueHeader.findUnique.mockResolvedValue({
      ...header,
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(2),
        },
      ],
    });
    transaction.product.findUnique.mockResolvedValue({ productCode: 'SKU-1' });
    transaction.goodsIssueHeader.findUniqueOrThrow.mockResolvedValue({
      ...header,
      status: DocumentStatus.POSTED,
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(2),
          product: { productCode: 'SKU-1', description: 'Widget' },
        },
      ],
      shop: { id: 'shop-1', shopName: 'Main Plant' },
    });

    const posted = await service.post(orgAdmin, 'gi-1');

    expect(posted.status).toBe(DocumentStatus.POSTED);
    expect(stock.postMovementOnce).toHaveBeenCalledTimes(1);
    expect(stock.resolveBalance).toHaveBeenCalled();
    expect(stock.postMovementOnce).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: TransactionType.GOODS_ISSUE,
        ref: 'GI-202605-00001',
        shopId: 'shop-1',
        productId: 'prod-1',
        outQty: new Prisma.Decimal(2),
        sourceType: 'GOODS_ISSUE',
        sourceId: 'gi-1',
      }),
    );
    expect(inventoryLots.consumeFifo).toHaveBeenCalledTimes(1);
    expect(audit.logTenant).toHaveBeenCalledTimes(1);
  });
});

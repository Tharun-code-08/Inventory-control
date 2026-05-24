import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, Prisma, RoleName } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentAlreadyPostedException } from '../../common/exceptions/domain.exceptions';
import { GoodsReceiptsService } from './goods-receipts.service';

const adminUser: RequestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: null,
  companyId: 'co-1',
  tenantShopIds: ['s1'],
  permissions: [],
};

function buildTx(overrides: Record<string, any> = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    purchaseOrderHeader: { findUnique: jest.fn() },
    goodsReceiptHeader: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
    },
    goodsReceiptItem: { deleteMany: jest.fn() },
    // CostingService inflow path queries the shop's costingMethod inside the
    // same transaction; default to AVERAGE so legacy tests don't need to know.
    shop: { findUnique: jest.fn().mockResolvedValue({ costingMethod: 'AVERAGE' }) },
    stockSummary: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    costLayer: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    ...overrides,
  };
}

function makePrisma(tx: any) {
  return {
    $transaction: async (fn: (t: any) => any) => fn(tx),
    goodsReceiptHeader: {
      findUnique: jest.fn(),
    },
  } as any;
}

const auditFactory = () => ({ log: jest.fn().mockResolvedValue(undefined) }) as any;
const numbersFactory = (n = 'GR-202605-00001') =>
  ({ nextNumber: jest.fn().mockResolvedValue(n) }) as any;
const stockFactory = () =>
  ({ postMovementOnce: jest.fn().mockResolvedValue(undefined) }) as any;
const costingFactory = () =>
  ({
    recordInflow: jest.fn().mockResolvedValue(undefined),
    recordOutflow: jest
      .fn()
      .mockResolvedValue({ totalCost: new Prisma.Decimal(0), unitCost: new Prisma.Decimal(0) }),
  }) as any;

describe('GoodsReceiptsService.create', () => {
  it('rejects future grDate', async () => {
    const tx = buildTx();
    const service = new GoodsReceiptsService(
      makePrisma(tx),
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
    );
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await expect(
      service.create(adminUser, {
        shopId: 's1',
        grDate: future,
        supplierName: 'ACME',
        items: [{ productId: 'p1', quantity: 1, uom: 'PCS', purchaseRate: 10 }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-positive line quantities', async () => {
    const tx = buildTx();
    const service = new GoodsReceiptsService(
      makePrisma(tx),
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
    );
    await expect(
      service.create(adminUser, {
        shopId: 's1',
        grDate: '2026-04-01',
        supplierName: 'ACME',
        items: [{ productId: 'p1', quantity: 0, uom: 'PCS', purchaseRate: 10 }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('GoodsReceiptsService.post', () => {
  it('rejects when GR is already POSTED', async () => {
    const tx = buildTx();
    const prisma = makePrisma(tx);
    prisma.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.POSTED,
      items: [],
    });
    const service = new GoodsReceiptsService(
      prisma,
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
    );
    await expect(service.post(adminUser, 'gr-1')).rejects.toBeInstanceOf(
      DocumentAlreadyPostedException,
    );
  });

  it('rejects when concurrent post wins (updateMany affects 0 rows)', async () => {
    const items = [
      { id: 'l1', productId: 'p1', quantity: new Prisma.Decimal(1), purchaseRate: new Prisma.Decimal(10), lineValue: new Prisma.Decimal(10) },
    ];
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.DRAFT,
      purchaseOrderId: null,
      items,
    });
    tx.goodsReceiptHeader.updateMany.mockResolvedValue({ count: 0 });
    const prisma = makePrisma(tx);
    prisma.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.DRAFT,
      items,
    });
    const service = new GoodsReceiptsService(
      prisma,
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
    );
    await expect(service.post(adminUser, 'gr-1')).rejects.toBeInstanceOf(
      DocumentAlreadyPostedException,
    );
  });

  it('happy path: posts each item idempotently and audits with tx', async () => {
    const items = [
      {
        id: 'l1',
        productId: 'p1',
        quantity: new Prisma.Decimal(2),
        purchaseRate: new Prisma.Decimal(10),
        lineValue: new Prisma.Decimal(20),
      },
      {
        id: 'l2',
        productId: 'p2',
        quantity: new Prisma.Decimal(1),
        purchaseRate: new Prisma.Decimal(15),
        lineValue: new Prisma.Decimal(15),
      },
    ];
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.DRAFT,
      purchaseOrderId: null,
      items,
    });
    tx.goodsReceiptHeader.findUniqueOrThrow.mockResolvedValue({
      id: 'gr-1',
      grNumber: 'GR-1',
      status: DocumentStatus.POSTED,
      totalValue: new Prisma.Decimal('35.00'),
      items,
    });
    const prisma = makePrisma(tx);
    prisma.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.DRAFT,
      items,
    });
    const stockSvc = stockFactory();
    const auditSvc = auditFactory();
    const service = new GoodsReceiptsService(
      prisma,
      stockSvc,
      numbersFactory(),
      auditSvc,
      costingFactory(),
    );

    await service.post(adminUser, 'gr-1');

    expect(stockSvc.postMovementOnce).toHaveBeenCalledTimes(2);
    expect(stockSvc.postMovementOnce.mock.calls[0][1].idempotencyKey).toBe('gr:gr-1:l1');
    expect(stockSvc.postMovementOnce.mock.calls[1][1].idempotencyKey).toBe('gr:gr-1:l2');
    expect(tx.goodsReceiptHeader.updateMany).toHaveBeenCalledTimes(1);
    expect(auditSvc.log).toHaveBeenCalledTimes(1);
    expect(auditSvc.log.mock.calls[0][1]).toBe(tx);
  });

  it('takes a per-PO advisory lock when validating against purchase order', async () => {
    const items = [
      { id: 'l1', productId: 'p1', quantity: new Prisma.Decimal(1), purchaseRate: new Prisma.Decimal(10), lineValue: new Prisma.Decimal(10) },
    ];
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.DRAFT,
      purchaseOrderId: 'po-1',
      items,
    });
    tx.purchaseOrderHeader.findUnique.mockResolvedValue({
      id: 'po-1',
      status: 'CONFIRMED',
      lifecycleStatus: 'CONFIRMED',
      items: [{ productId: 'p1', orderQty: new Prisma.Decimal(10) }],
    });
    tx.goodsReceiptHeader.findUniqueOrThrow.mockResolvedValue({
      id: 'gr-1',
      grNumber: 'GR-1',
      status: DocumentStatus.POSTED,
      totalValue: new Prisma.Decimal('10.00'),
      items,
    });
    // Mock the postedReceipts findMany separately by extending tx:
    (tx.goodsReceiptHeader as any).findMany = jest.fn().mockResolvedValue([]);
    const prisma = makePrisma(tx);
    prisma.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grNumber: 'GR-1',
      grDate: new Date('2026-04-01'),
      status: DocumentStatus.DRAFT,
      items,
    });
    const service = new GoodsReceiptsService(
      prisma,
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
    );
    await service.post(adminUser, 'gr-1');

    expect(tx.$executeRaw).toHaveBeenCalled();
  });
});

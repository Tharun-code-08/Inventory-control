import { BadRequestException } from '@nestjs/common';
import { CostingMethod, DocumentStatus, Prisma, RoleName, TransactionType } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentAlreadyPostedException } from '../../common/exceptions/domain.exceptions';
import { GoodsReceiptsService } from './goods-receipts.service';

function makeService() {
  const tx = {
    goodsReceiptHeader: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    shop: {
      findUnique: jest.fn(),
    },
    storageLocation: {
      findFirst: jest.fn().mockResolvedValue({ id: 'loc-1', shopId: 'shop-1', isActive: true }),
    },
    productPlant: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const prisma = {
    goodsReceiptHeader: {
      findUnique: jest.fn(),
    },
    storageLocation: {
      findFirst: jest.fn().mockResolvedValue({ id: 'loc-1', shopId: 'shop-1', isActive: true }),
    },
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  } as any;

  const stock = { postMovementOnce: jest.fn() } as any;
  const numbers = { nextConfiguredShopScopedNumber: jest.fn() } as any;
  const audit = { log: jest.fn(), logTenant: jest.fn(), logPlatform: jest.fn() } as any;
  const costing = { recordInflow: jest.fn() } as any;

  const service = new GoodsReceiptsService(
    prisma,
    stock,
    numbers,
    audit,
    costing,
    { sendInternalAlert: jest.fn().mockResolvedValue(undefined) } as any,
    { renderDocumentPdf: jest.fn() } as any,
    { sendDocument: jest.fn() } as any,
  );
  return { service, prisma, tx, stock, audit, costing };
}

describe('GoodsReceiptsService', () => {
  it('posts stock movements when a draft goods receipt is posted', async () => {
    const { service, tx, stock, costing, audit } = makeService();
    const header = {
      id: 'gr-1',
      grNumber: 'GR-001',
      grDate: new Date('2026-05-25T00:00:00.000Z'),
      shopId: 'shop-1',
      status: DocumentStatus.DRAFT,
      purchaseOrderId: null,
    };

    jest.spyOn(service, 'get').mockResolvedValue(header as never);
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      ...header,
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(3),
          purchaseRate: new Prisma.Decimal(100),
          lineValue: new Prisma.Decimal(300),
          batchNumber: null,
          serialNumber: null,
          storageLocationId: 'loc-1',
          expiryDate: new Date('2027-12-31'),
        },
      ],
    });
    tx.shop.findUnique.mockResolvedValue({ costingMethod: CostingMethod.AVERAGE });
    tx.goodsReceiptHeader.updateMany.mockResolvedValue({ count: 1 });
    tx.goodsReceiptHeader.findUniqueOrThrow.mockResolvedValue({
      ...header,
      status: DocumentStatus.POSTED,
      totalValue: new Prisma.Decimal(300),
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(3),
          purchaseRate: new Prisma.Decimal(100),
          lineValue: new Prisma.Decimal(300),
          product: { productCode: 'SKU-1', description: 'Widget' },
        },
      ],
      shop: { id: 'shop-1', shopName: 'Main Plant' },
    });

    await service.post(
      { id: 'user-1', shopId: 'shop-1', role: 'ADMIN', companyId: 'co-1', permissions: [] } as never,
      'gr-1',
    );

    expect(stock.postMovementOnce).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: TransactionType.GOODS_RECEIPT,
        ref: 'GR-001',
        shopId: 'shop-1',
        productId: 'prod-1',
        inQty: 3,
        outQty: 0,
      }),
    );
    expect(costing.recordInflow).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
  });
});

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
    storageLocation: {
      findFirst: jest.fn().mockResolvedValue({ id: 'loc-1', shopId: 's1', isActive: true }),
    },
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
    productPlant: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
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
    storageLocation: {
      findFirst: jest.fn().mockResolvedValue({ id: 'loc-1', shopId: 's1', isActive: true }),
    },
  } as any;
}

const auditFactory = () => ({
  log: jest.fn().mockResolvedValue(undefined),
  logTenant: jest.fn().mockResolvedValue(undefined),
  logPlatform: jest.fn().mockResolvedValue(undefined),
}) as any;
const numbersFactory = (n = 'GR-202605-00001') =>
  ({ nextConfiguredShopScopedNumber: jest.fn().mockResolvedValue(n) }) as any;
const stockFactory = () =>
  ({ postMovementOnce: jest.fn().mockResolvedValue(undefined) }) as any;
const costingFactory = () =>
  ({
    recordInflow: jest.fn().mockResolvedValue(undefined),
    recordOutflow: jest
      .fn()
      .mockResolvedValue({ totalCost: new Prisma.Decimal(0), unitCost: new Prisma.Decimal(0) }),
  }) as any;
const emailNotificationsFactory = () =>
  ({ sendInternalAlert: jest.fn().mockResolvedValue(undefined) }) as any;
const documentPdfFactory = () => ({ renderDocumentPdf: jest.fn() }) as any;
const documentEmailFactory = () => ({ sendDocument: jest.fn() }) as any;

describe('GoodsReceiptsService.create', () => {
  it('rejects future grDate', async () => {
    const tx = buildTx();
    const service = new GoodsReceiptsService(
      makePrisma(tx),
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
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
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
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

  it('rejects missing storage location on create', async () => {
    const tx = buildTx();
    const service = new GoodsReceiptsService(
      makePrisma(tx),
      stockFactory(),
      numbersFactory(),
      auditFactory(),
      costingFactory(),
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
    );
    await expect(
      service.create(adminUser, {
        shopId: 's1',
        grDate: '2026-04-01',
        supplierName: 'ACME',
        items: [{ productId: 'p1', quantity: 1, uom: 'PCS', purchaseRate: 10 }],
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
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
    );
    await expect(service.post(adminUser, 'gr-1')).rejects.toBeInstanceOf(
      DocumentAlreadyPostedException,
    );
  });

  it('rejects when concurrent post wins (updateMany affects 0 rows)', async () => {
    const items = [
      {
        id: 'l1',
        productId: 'p1',
        quantity: new Prisma.Decimal(1),
        purchaseRate: new Prisma.Decimal(10),
        lineValue: new Prisma.Decimal(10),
        storageLocationId: 'loc-1',
        expiryDate: new Date('2027-12-31'),
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
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
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
        storageLocationId: 'loc-1',
        expiryDate: new Date('2027-12-31'),
      },
      {
        id: 'l2',
        productId: 'p2',
        quantity: new Prisma.Decimal(1),
        purchaseRate: new Prisma.Decimal(15),
        lineValue: new Prisma.Decimal(15),
        storageLocationId: 'loc-1',
        expiryDate: new Date('2027-12-31'),
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
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
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
      {
        id: 'l1',
        productId: 'p1',
        quantity: new Prisma.Decimal(1),
        purchaseRate: new Prisma.Decimal(10),
        lineValue: new Prisma.Decimal(10),
        storageLocationId: 'loc-1',
        expiryDate: new Date('2027-12-31'),
      },
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
      emailNotificationsFactory(),
      documentPdfFactory(),
      documentEmailFactory(),
    );
    await service.post(adminUser, 'gr-1');

    expect(tx.$executeRaw).toHaveBeenCalled();
  });
});

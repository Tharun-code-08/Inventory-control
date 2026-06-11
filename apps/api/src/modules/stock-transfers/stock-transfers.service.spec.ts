import { DocumentStatus, Prisma, RoleName, TransactionType } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { StockTransfersService } from './stock-transfers.service';

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
    stockTransferHeader: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    shop: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'shop-1', companyId: 'co-1' },
        { id: 'shop-2', companyId: 'co-1' },
      ]),
    },
    product: { findUnique: jest.fn() },
    stockSummary: {
      findUnique: jest.fn().mockResolvedValue({ currentStock: new Prisma.Decimal(10) }),
    },
    storageLocation: { findUnique: jest.fn() },
    ...overrides,
  };
}

function makeService(tx: ReturnType<typeof buildTx>) {
  const prisma = {
    stockTransferHeader: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  } as any;

  const stock = {
    postMovementOnce: jest.fn(),
    resolveBalance: jest.fn().mockResolvedValue(new Prisma.Decimal(10)),
  } as any;
  const numbers = {
    nextShopScopedNumber: jest.fn().mockResolvedValue('ST-202605-00001'),
  } as any;
  const audit = { log: jest.fn(), logTenant: jest.fn(), logPlatform: jest.fn() } as any;

  const service = new StockTransfersService(prisma, stock, numbers, audit);
  return { service, prisma, tx, stock, audit, numbers };
}

describe('StockTransfersService', () => {
  it('lists stock transfers with serialized item counts', async () => {
    const tx = buildTx();
    const { service, prisma } = makeService(tx);
    const createdAt = new Date('2026-05-26T10:00:00.000Z');
    prisma.stockTransferHeader.findMany.mockResolvedValue([
      {
        id: 'st-1',
        transferNumber: 'ST-202605-00001',
        transferDate: new Date('2026-05-26T00:00:00.000Z'),
        fromShopId: 'shop-1',
        toShopId: 'shop-2',
        fromStorageLocationId: null,
        toStorageLocationId: null,
        status: DocumentStatus.DRAFT,
        notes: null,
        postedAt: null,
        createdAt,
        updatedAt: createdAt,
        fromShop: { id: 'shop-1', shopName: 'Main Plant', shopNumber: 'HQ-001' },
        toShop: { id: 'shop-2', shopName: 'Branch', shopNumber: 'BR-001' },
        _count: { items: 2 },
      },
    ]);

    const result = await service.list(orgAdmin, { take: 100 });

    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'st-1',
        transferNumber: 'ST-202605-00001',
        transferDate: '2026-05-26',
        itemCount: 2,
      }),
    ]);
  });

  it('creates a draft stock transfer with shop-scoped number', async () => {
    const tx = buildTx();
    const { service, tx: transaction, numbers } = makeService(tx);
    transaction.stockTransferHeader.create.mockResolvedValue({
      id: 'st-1',
      transferNumber: 'ST-202605-00001',
      status: DocumentStatus.DRAFT,
      items: [],
    });

    await service.create(orgAdmin, {
      fromShopId: 'shop-1',
      toShopId: 'shop-2',
      transferDate: '2026-05-26',
      items: [{ productId: 'prod-1', quantity: 2, uom: 'pcs' }],
    });

    expect(numbers.nextShopScopedNumber).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        shopId: 'shop-1',
        docType: 'ST',
        basePrefix: 'ST',
      }),
    );
    expect(transaction.stockTransferHeader.create).toHaveBeenCalled();
  });

  it('posts a draft transfer with OUT and IN stock movements', async () => {
    const tx = buildTx();
    const { service, tx: transaction, stock, audit } = makeService(tx);
    const header = {
      id: 'st-1',
      transferNumber: 'ST-202605-00001',
      transferDate: new Date('2026-05-26T00:00:00.000Z'),
      fromShopId: 'shop-1',
      toShopId: 'shop-2',
      status: DocumentStatus.DRAFT,
    };

    jest.spyOn(service, 'get').mockResolvedValue(header as never);
    transaction.stockTransferHeader.findUnique.mockResolvedValue({
      ...header,
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(2),
        },
      ],
    });
    transaction.stockTransferHeader.findUniqueOrThrow.mockResolvedValue({
      ...header,
      status: DocumentStatus.POSTED,
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(2),
          product: { productCode: 'SKU-1' },
        },
      ],
      fromShop: { id: 'shop-1', shopName: 'Main Plant' },
      toShop: { id: 'shop-2', shopName: 'Branch' },
      fromStorageLocation: null,
      toStorageLocation: null,
    });

    const posted = await service.post(orgAdmin, 'st-1');

    expect(posted.status).toBe(DocumentStatus.POSTED);
    expect(stock.postMovementOnce).toHaveBeenCalledTimes(2);
    expect(stock.postMovementOnce).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: TransactionType.STOCK_TRANSFER_OUT,
        shopId: 'shop-1',
        productId: 'prod-1',
        outQty: new Prisma.Decimal(2),
      }),
    );
    expect(stock.postMovementOnce).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: TransactionType.STOCK_TRANSFER_IN,
        shopId: 'shop-2',
        productId: 'prod-1',
        inQty: new Prisma.Decimal(2),
      }),
    );
    expect(audit.logTenant).toHaveBeenCalledTimes(1);
  });
});

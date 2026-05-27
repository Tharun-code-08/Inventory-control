import { BadRequestException } from '@nestjs/common';
import { Prisma, TaxPreference, TransactionType } from '@prisma/client';
import { ProductsService } from './products.service';

type Mock = jest.Mock;

function makePlant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plant-1',
    productId: 'prod-1',
    shopId: 'shop-1',
    storageLocationId: null,
    openingStock: new Prisma.Decimal(2),
    minStockLevel: new Prisma.Decimal(1),
    maxStockLevel: new Prisma.Decimal(10),
    reorderQty: new Prisma.Decimal(3),
    isActive: true,
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    createdById: 'user-1',
    updatedById: null,
    storageLocation: null,
    ...overrides,
  };
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    productCode: 'SKU1',
    description: 'Widget',
    uom: 'pcs',
    category: 'Pump',
    hsnCode: null,
    materialGroup: null,
    drawingReference: null,
    brand: null,
    taxPreference: TaxPreference.TAXABLE,
    purchasePrice: new Prisma.Decimal(10),
    sellingPrice: new Prisma.Decimal(12),
    isActive: true,
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    createdById: 'user-1',
    updatedById: null,
    plants: [makePlant()],
    specifications: [],
    ...overrides,
  };
}

function makePrisma() {
  const tx = {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    storageLocation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    stockSummary: {
      findMany: jest.fn(),
    },
    stockLedger: {
      groupBy: jest.fn(),
    },
    productPlant: {
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  return {
    $transaction: jest.fn(async (callback: unknown) => {
      if (typeof callback === 'function') {
        return (callback as (client: typeof tx) => Promise<unknown>)(tx);
      }
      return callback;
    }),
    shop: {
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    goodsReceiptItem: {
      count: jest.fn(),
    },
    goodsIssueItem: {
      count: jest.fn(),
    },
    purchaseOrderItem: {
      count: jest.fn(),
    },
    damagedStock: {
      count: jest.fn(),
    },
    stockLedger: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    stockSummary: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    __tx: tx,
  } as unknown as {
    $transaction: Mock;
    shop: { findMany: Mock };
    product: { findUnique: Mock; findMany: Mock; delete: Mock };
    goodsReceiptItem: { count: Mock };
    goodsIssueItem: { count: Mock };
    purchaseOrderItem: { count: Mock };
    damagedStock: { count: Mock };
    stockLedger: { count: Mock; groupBy: Mock };
    stockSummary: { findMany: Mock };
    auditLog: { create: Mock };
    __tx: typeof tx;
  };
}

function makeUser() {
  return {
    id: 'user-1',
    companyId: 'company-1',
    shopId: 'shop-1',
    shopIds: ['shop-1'],
    role: 'admin',
    permissions: ['product:write'],
  } as never;
}

describe('ProductsService bulk workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates a new SKU upload without committing changes', async () => {
    const prisma = makePrisma();
    prisma.shop.findMany.mockResolvedValue([{ id: 'shop-1', shopNumber: 'S1', shopName: 'Main' }]);
    prisma.__tx.product.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.__tx.storageLocation.findMany.mockResolvedValue([]);
    prisma.__tx.stockSummary.findMany.mockResolvedValue([]);
    prisma.__tx.stockLedger.groupBy.mockResolvedValue([]);

    const stock = { postMovement: jest.fn() };
    const subscriptions = { assertSkuLimit: jest.fn().mockResolvedValue(undefined) };
    const service = new ProductsService(
      prisma as never,
      stock as never,
      subscriptions as never,
      {} as never,
      {} as never,
    );

    const result = await service.bulkUpsert(makeUser(), {
      validateOnly: true,
      rows: [
        {
          description: 'Bulk created widget',
          category: 'Pump',
          uom: 'pcs',
          purchasePrice: 10,
          sellingPrice: 12,
          openingStock: 5,
          minStockLevel: 1,
          shopNumber: 'S1',
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        validateOnly: true,
        validated: 1,
        failed: 0,
      }),
    );
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        status: 'validated',
        action: 'create',
        productCode: 'PUM001',
      }),
    );
    expect(prisma.__tx.product.create).not.toHaveBeenCalled();
    expect(stock.postMovement).not.toHaveBeenCalled();
  });

  it('updates an existing SKU and synchronizes stock during commit mode', async () => {
    const prisma = makePrisma();
    prisma.shop.findMany.mockResolvedValue([{ id: 'shop-1', shopNumber: 'S1', shopName: 'Main' }]);
    prisma.__tx.product.findMany.mockResolvedValue([makeProduct()]);
    prisma.__tx.storageLocation.findMany.mockResolvedValue([]);
    prisma.__tx.stockSummary.findMany.mockResolvedValue([]);
    prisma.__tx.stockLedger.groupBy.mockResolvedValue([
      {
        productId: 'prod-1',
        shopId: 'shop-1',
        _sum: { inQty: new Prisma.Decimal(2), outQty: new Prisma.Decimal(0) },
      },
    ]);
    prisma.__tx.product.update.mockResolvedValue(undefined);
    prisma.__tx.productPlant.update.mockResolvedValue(undefined);

    const stock = { postMovement: jest.fn().mockResolvedValue(undefined) };
    const subscriptions = { assertSkuLimit: jest.fn().mockResolvedValue(undefined) };
    const service = new ProductsService(
      prisma as never,
      stock as never,
      subscriptions as never,
      {} as never,
      {} as never,
    );

    const result = await service.bulkUpsert(makeUser(), {
      validateOnly: false,
      rows: [
        {
          productCode: 'SKU1',
          description: 'Updated widget',
          category: 'Pump',
          uom: 'pcs',
          purchasePrice: 10,
          sellingPrice: 13,
          openingStock: 5,
          minStockLevel: 2,
          shopNumber: 'S1',
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        updated: 1,
        failed: 0,
      }),
    );
    expect(prisma.__tx.product.update).toHaveBeenCalled();
    expect(prisma.__tx.productPlant.update).toHaveBeenCalled();
    expect(stock.postMovement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: TransactionType.OPENING,
        productId: 'prod-1',
        shopId: 'shop-1',
        inQty: 3,
        outQty: 0,
      }),
    );
  });

  it('returns a structured delete-blocking error when product history exists', async () => {
    const prisma = makePrisma();
    const stock = { postMovement: jest.fn() };
    const subscriptions = { assertSkuLimit: jest.fn() };
    const service = new ProductsService(
      prisma as never,
      stock as never,
      subscriptions as never,
      {} as never,
      {} as never,
    );

    jest.spyOn(service, 'get').mockResolvedValue(
      makeProduct({ plants: [] }) as never,
    );
    jest.spyOn(service, 'deletionImpact').mockResolvedValue({
      canDelete: false,
      reason: 'Cannot delete because transaction history already exists.',
      suggestedAction: 'deactivate',
      currentStock: 0,
      historyCount: 1,
      history: {
        goodsReceipts: 1,
        goodsIssues: 0,
        purchaseOrders: 0,
        damaged: 0,
        stockLedger: 0,
      },
      plants: [],
    } as never);

    let thrown: unknown;
    try {
      await service.remove(makeUser(), 'prod-1');
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    const response = (thrown as BadRequestException).getResponse();
    expect(response).toMatchObject({
      message: 'Cannot delete because transaction history already exists.',
      error: {
        code: 'PRODUCT_DELETE_BLOCKED',
      },
    });
  });
});

import { AuditAction, Prisma, TaxPreference } from '@prisma/client';
import { ProductsService } from './products.service';

type Mock = jest.Mock;

/**
 * Day 4 acceptance: prove CREATE_PRODUCT, UPDATE_PRODUCT, and DELETE_PRODUCT
 * each write an audit row inside the same transaction as the write itself,
 * and that UPDATE_PRODUCT records only the fields that actually changed.
 */

function makePlant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plant-1',
    productId: 'prod-1',
    shopId: 'shop-1',
    storageLocationId: null,
    openingStock: new Prisma.Decimal(0),
    minStockLevel: new Prisma.Decimal(1),
    maxStockLevel: new Prisma.Decimal(10),
    reorderQty: new Prisma.Decimal(3),
    batchNumber: null,
    expiryDate: null,
    isActive: true,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    updatedAt: new Date('2026-06-13T00:00:00.000Z'),
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
    gstRate: new Prisma.Decimal(18),
    purchasePrice: new Prisma.Decimal(10),
    sellingPrice: new Prisma.Decimal(12),
    isActive: true,
    imageUrl: null,
    thumbnailUrl: null,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    updatedAt: new Date('2026-06-13T00:00:00.000Z'),
    createdById: 'user-1',
    updatedById: null,
    plants: [makePlant()],
    specifications: [],
    ...overrides,
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

function makeHarness() {
  const tx = {
    product: {
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      delete: jest.fn(),
    },
    storageLocation: { findUnique: jest.fn() },
    productSpecification: { deleteMany: jest.fn(), createMany: jest.fn() },
    productPlant: { update: jest.fn(), create: jest.fn(), delete: jest.fn() },
  };

  const prisma = {
    // Pass the tx client through so we can assert audit.log received it.
    $transaction: jest.fn(async (cb: unknown) =>
      typeof cb === 'function'
        ? (cb as (c: unknown) => Promise<unknown>)(tx)
        : cb,
    ),
    product: { findUnique: jest.fn(), delete: jest.fn() },
  };

  const stock = {
    postMovement: jest.fn().mockResolvedValue(undefined),
    buildStockBalanceMap: jest.fn().mockResolvedValue(new Map()),
  };
  const subscriptions = { assertSkuLimit: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new ProductsService(
    prisma as never,
    stock as never,
    subscriptions as never,
    {} as never,
    {} as never,
    {} as never,
    audit as never,
  );

  return { service, prisma, tx, stock, audit } as {
    service: ProductsService;
    prisma: { $transaction: Mock; product: { findUnique: Mock; delete: Mock } };
    tx: typeof tx;
    stock: { postMovement: Mock; buildStockBalanceMap: Mock };
    audit: { log: Mock };
  };
}

describe('ProductsService audit logging (Day 4)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CREATE_PRODUCT: writes an audit row inside the transaction', async () => {
    const { service, tx, audit } = makeHarness();
    tx.product.create.mockResolvedValue(makeProduct());

    await service.create(makeUser(), {
      productCode: 'SKU1',
      description: 'Widget',
      uom: 'pcs',
      category: 'Pump',
      purchasePrice: 10,
      sellingPrice: 12,
      plants: [{ shopId: 'shop-1', minStockLevel: 1, isActive: true }],
    } as never);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [params, txArg] = audit.log.mock.calls[0];
    expect(params.action).toBe(AuditAction.CREATE_PRODUCT);
    expect(params.entityType).toBe('PRODUCT');
    expect(params.entityId).toBe('prod-1');
    expect(params.metadata).toMatchObject({ productCode: 'SKU1', description: 'Widget' });
    // Proves the audit shares the write's transaction client.
    expect(txArg).toBe(tx);
  });

  it('UPDATE_PRODUCT: records only the changed field (price 12 -> 20)', async () => {
    const { service, prisma, tx, audit } = makeHarness();
    prisma.product.findUnique.mockResolvedValue(makeProduct());
    tx.product.update.mockResolvedValue(
      makeProduct({ sellingPrice: new Prisma.Decimal(20) }),
    );
    tx.product.findUniqueOrThrow.mockResolvedValue(
      makeProduct({ sellingPrice: new Prisma.Decimal(20) }),
    );

    await service.update(makeUser(), 'prod-1', { sellingPrice: 20 } as never);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [params, txArg] = audit.log.mock.calls[0];
    expect(params.action).toBe(AuditAction.UPDATE_PRODUCT);
    expect(params.entityId).toBe('prod-1');
    expect(params.oldValues).toEqual({ sellingPrice: 12 });
    expect(params.newValues).toEqual({ sellingPrice: 20 });
    expect(params.metadata.changedFields).toEqual(['sellingPrice']);
    expect(txArg).toBe(tx);
  });

  it('UPDATE_PRODUCT: captures multiple changed fields with before/after', async () => {
    const { service, prisma, tx, audit } = makeHarness();
    prisma.product.findUnique.mockResolvedValue(makeProduct());
    tx.product.update.mockResolvedValue(makeProduct());
    tx.product.findUniqueOrThrow.mockResolvedValue(makeProduct());

    await service.update(makeUser(), 'prod-1', {
      description: 'Updated Widget',
      gstRate: 20,
      purchasePrice: 11,
    } as never);

    const [params] = audit.log.mock.calls[0];
    expect(params.oldValues).toEqual({
      description: 'Widget',
      gstRate: 18,
      purchasePrice: 10,
    });
    expect(params.newValues).toEqual({
      description: 'Updated Widget',
      gstRate: 20,
      purchasePrice: 11,
    });
    expect(params.metadata.changedFields.sort()).toEqual(
      ['description', 'gstRate', 'purchasePrice'].sort(),
    );
  });

  it('UPDATE_PRODUCT: no audit row when nothing actually changes', async () => {
    const { service, prisma, tx, audit } = makeHarness();
    prisma.product.findUnique.mockResolvedValue(makeProduct());
    tx.product.update.mockResolvedValue(makeProduct());
    tx.product.findUniqueOrThrow.mockResolvedValue(makeProduct());

    // sellingPrice 12 == existing 12 -> no change
    await service.update(makeUser(), 'prod-1', { sellingPrice: 12 } as never);

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('DELETE_PRODUCT: writes an audit row inside the transaction', async () => {
    const { service, tx, audit } = makeHarness();
    jest.spyOn(service, 'get').mockResolvedValue(makeProduct() as never);
    jest.spyOn(service, 'deletionImpact').mockResolvedValue({
      canDelete: true,
      reason: 'This product can be deleted.',
      suggestedAction: null,
      currentStock: 0,
      historyCount: 0,
      history: {
        goodsReceipts: 0,
        goodsIssues: 0,
        purchaseOrders: 0,
        damaged: 0,
        stockLedger: 0,
      },
      plants: [],
    } as never);
    tx.product.delete.mockResolvedValue(makeProduct());

    await service.remove(makeUser(), 'prod-1');

    expect(tx.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    expect(audit.log).toHaveBeenCalledTimes(1);
    const [params, txArg] = audit.log.mock.calls[0];
    expect(params.action).toBe(AuditAction.DELETE_PRODUCT);
    expect(params.entityId).toBe('prod-1');
    expect(params.oldValues).toMatchObject({ productCode: 'SKU1', description: 'Widget' });
    expect(txArg).toBe(tx);
  });
});

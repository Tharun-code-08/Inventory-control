import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, RoleName, SalesOrderStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { SalesOrdersService } from './sales-orders.service';

const adminUser: RequestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: null,
  permissions: [],
} as unknown as RequestUser;

function buildTx() {
  return {
    salesOrderHeader: {
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    salesOrderItem: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: { create: jest.fn() },
  };
}

function makePrisma(tx: any) {
  return {
    $transaction: async (fn: (t: any) => any) => fn(tx),
    salesOrderHeader: {
      findUnique: jest.fn(),
    },
    shop: {
      findUnique: jest.fn().mockResolvedValue({ costingMethod: 'AVERAGE' }),
    },
  } as any;
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) }) as any;
const numbers = (n = 'SO-HQ001-202605-00001') => {
  const nextShopScopedNumber = jest.fn().mockResolvedValue(n);
  return { nextNumber: nextShopScopedNumber, nextShopScopedNumber } as any;
};
const stock = () => ({ postMovementOnce: jest.fn().mockResolvedValue(undefined) }) as any;
const costing = () =>
  ({
    recordInflow: jest.fn().mockResolvedValue(undefined),
    recordOutflow: jest
      .fn()
      .mockResolvedValue({ totalCost: new Prisma.Decimal(0), unitCost: new Prisma.Decimal(0) }),
  }) as any;

describe('SalesOrdersService.create', () => {
  it('rejects when shopId is absent on actor and DTO', async () => {
    const tx = buildTx();
    const prisma = makePrisma(tx);
    const service = new SalesOrdersService(prisma, stock(), numbers(), audit(), costing());

    await expect(
      service.create(adminUser, { customerId: 'c1', items: [] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses DocumentNumberService for soNumber and computes line totals as Decimal', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.create.mockResolvedValue({
      id: 'so-1',
      soNumber: 'SO-202605-00001',
      customerId: 'c1',
      totalValue: new Prisma.Decimal('150.00'),
    });
    const prisma = makePrisma(tx);
    const numbersSvc = numbers('SO-202605-00001');
    const auditSvc = audit();
    const service = new SalesOrdersService(prisma, stock(), numbersSvc, auditSvc, costing());

    const created = await service.create(adminUser, {
      shopId: 'shop-1',
      customerId: 'c1',
      orderDate: '2026-05-01',
      items: [
        { productId: 'p1', quantity: 2, unitPrice: 50 },
        { productId: 'p2', quantity: 1, unitPrice: 50 },
      ],
    } as any);

    expect(numbersSvc.nextNumber).toHaveBeenCalledTimes(1);
    expect(tx.salesOrderHeader.create).toHaveBeenCalledTimes(1);
    const data = tx.salesOrderHeader.create.mock.calls[0][0].data;
    expect(data.soNumber).toBe('SO-202605-00001');
    expect(data.status).toBe(SalesOrderStatus.DRAFT);
    expect(new Prisma.Decimal(data.totalValue).toFixed(2)).toBe('150.00');
    expect(data.items.create).toHaveLength(2);
    expect(auditSvc.log).toHaveBeenCalledTimes(1);
    expect(auditSvc.log.mock.calls[0][1]).toBe(tx);
    expect(created.id).toBe('so-1');
  });
});

describe('SalesOrdersService.confirm', () => {
  it('throws ConflictException when no row was DRAFT (atomic transition lost)', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.updateMany.mockResolvedValue({ count: 0 });
    const prisma = makePrisma(tx);
    prisma.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 'shop-1',
      status: SalesOrderStatus.DRAFT,
      items: [],
    });
    const service = new SalesOrdersService(prisma, stock(), numbers(), audit(), costing());

    await expect(service.confirm(adminUser, 'so-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects confirm on a non-DRAFT order', async () => {
    const tx = buildTx();
    const prisma = makePrisma(tx);
    prisma.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 'shop-1',
      status: SalesOrderStatus.FULFILLED,
      items: [],
    });
    const service = new SalesOrdersService(prisma, stock(), numbers(), audit(), costing());
    await expect(service.confirm(adminUser, 'so-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns idempotently when already CONFIRMED', async () => {
    const tx = buildTx();
    const prisma = makePrisma(tx);
    const so = {
      id: 'so-1',
      shopId: 'shop-1',
      status: SalesOrderStatus.CONFIRMED,
      items: [],
    };
    prisma.salesOrderHeader.findUnique.mockResolvedValue(so);
    const service = new SalesOrdersService(prisma, stock(), numbers(), audit(), costing());
    const result = await service.confirm(adminUser, 'so-1');
    expect(result).toBe(so);
    expect(tx.salesOrderHeader.updateMany).not.toHaveBeenCalled();
  });
});

describe('SalesOrdersService.fulfill', () => {
  /**
   * Builds an SO with one outstanding line. Used by the per-line tests below
   * so each one sets up the same baseline before tweaking a single mock.
   */
  function setupConfirmedSoWithOneLine() {
    const items = [
      {
        id: 'line-1',
        productId: 'p1',
        quantity: new Prisma.Decimal(2),
        shippedQty: new Prisma.Decimal(0),
        unitPrice: new Prisma.Decimal(10),
      },
    ];
    const tx = buildTx();
    tx.salesOrderItem.findMany.mockResolvedValue(items.map((i) => ({ quantity: i.quantity, shippedQty: i.quantity })));
    tx.salesOrderHeader.findUniqueOrThrow.mockResolvedValue({ id: 'so-1', items });
    const prisma = makePrisma(tx);
    prisma.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      soNumber: 'SO-1',
      shopId: 'shop-1',
      status: SalesOrderStatus.CONFIRMED,
      items,
    });
    return { tx, prisma, items };
  }

  it('throws ConflictException when the per-line atomic bump loses to a concurrent fulfilment', async () => {
    const { tx, prisma } = setupConfirmedSoWithOneLine();
    tx.salesOrderItem.updateMany.mockResolvedValue({ count: 0 });
    const service = new SalesOrdersService(prisma, stock(), numbers(), audit(), costing());
    await expect(service.fulfill(adminUser, 'so-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('issues stock movements with stable idempotency keys', async () => {
    const { tx, prisma } = setupConfirmedSoWithOneLine();
    tx.salesOrderItem.updateMany.mockResolvedValue({ count: 1 });
    const stockSvc = stock();
    const service = new SalesOrdersService(prisma, stockSvc, numbers(), audit(), costing());

    await service.fulfill(adminUser, 'so-1');

    expect(stockSvc.postMovementOnce).toHaveBeenCalledTimes(1);
    const payload = stockSvc.postMovementOnce.mock.calls[0][1];
    expect(payload.idempotencyKey).toBe('so-fulfill:so-1:line-1:0');
    expect(payload.outQty.toString()).toBe('2');
  });

  it('rejects fulfillment on non-CONFIRMED order', async () => {
    const tx = buildTx();
    const prisma = makePrisma(tx);
    prisma.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 'shop-1',
      status: SalesOrderStatus.DRAFT,
      items: [],
    });
    const service = new SalesOrdersService(prisma, stock(), numbers(), audit(), costing());
    await expect(service.fulfill(adminUser, 'so-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

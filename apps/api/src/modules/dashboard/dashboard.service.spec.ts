import type { RequestUser } from '../../common/types/request-user';
import { DashboardService } from './dashboard.service';

function sqlFromQueryArg(arg: unknown): string {
  if (arg && typeof arg === 'object' && 'strings' in arg) {
    return (arg as { strings: readonly string[] }).strings.join('');
  }
  return String(arg);
}

function isPriorPeriodCount(where: { grDate?: { lt?: Date }; giDate?: { lt?: Date } } | undefined) {
  return Boolean(where?.grDate?.lt ?? where?.giDate?.lt);
}

function makeService() {
  const queryRaw = jest.fn();
  const prisma = {
    product: {
      count: jest.fn().mockImplementation(({ where }: { where?: { createdAt?: unknown } }) =>
        where?.createdAt ? Promise.resolve(3) : Promise.resolve(10),
      ),
      groupBy: jest.fn().mockResolvedValue([{ category: 'General', _count: { _all: 10 } }]),
    },
    goodsReceiptHeader: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockImplementation(({ where }: { where?: { grDate?: { lt?: Date } } }) =>
        isPriorPeriodCount(where) ? Promise.resolve(4) : Promise.resolve(3),
      ),
    },
    goodsIssueHeader: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockImplementation(({ where }: { where?: { giDate?: { lt?: Date } } }) =>
        isPriorPeriodCount(where) ? Promise.resolve(1) : Promise.resolve(2),
      ),
    },
    purchaseOrderHeader: {
      count: jest.fn().mockResolvedValue(6),
    },
    salesOrderHeader: {
      count: jest.fn().mockResolvedValue(4),
    },
    $queryRaw: queryRaw,
  } as never;

  const service = new DashboardService(prisma);
  const user = {
    id: 'user-1',
    shopId: 'shop-1',
    companyId: 'co-1',
    role: 'ADMIN',
    permissions: ['report:view'],
    tenantShopIds: ['shop-1'],
  } as RequestUser;

  return { service, prisma, queryRaw, user };
}

describe('DashboardService', () => {
  it('uses current_stock and avg_cost (not selling_price) for stock value', async () => {
    const { service, queryRaw, user } = makeService();

    queryRaw
      .mockResolvedValueOnce([
        {
          total_value: '5000',
          low_count: '2',
          critical_count: '1',
          warning_count: '1',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const summary = await service.summary(user, 'shop-1');

    const aggregateSql = sqlFromQueryArg(queryRaw.mock.calls[0]?.[0]);
    expect(aggregateSql).toContain('s.current_stock');
    expect(aggregateSql).toContain('s.avg_cost');
    expect(aggregateSql).toContain('p.purchase_price');
    expect(aggregateSql).not.toContain('selling_price');
    expect(aggregateSql).toContain('<=');
    expect(summary.totalStockValue).toBe(5000);
    expect(summary.lowStockCount).toBe(2);
    expect(summary.lowStockCriticalCount).toBe(1);
    expect(summary.lowStockWarningCount).toBe(1);
    expect(summary.kpiContext).toEqual({
      productsAddedThisMonth: 3,
      stockValueAvgPerProduct: 500,
      transactionsPriorPeriod: 5,
      pendingPurchaseOrders: 6,
      pendingSalesOrders: 4,
    });
  });

  it('low-stock list query treats stock equal to reorder level as low stock', async () => {
    const { service, queryRaw, user } = makeService();

    queryRaw
      .mockResolvedValueOnce([
        {
          total_value: '0',
          low_count: '1',
          critical_count: '0',
          warning_count: '1',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          product_code: 'SKU-1',
          description: 'Widget',
          category: 'General',
          current_stock: '10',
          min_stock_level: '10',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const summary = await service.summary(user, 'shop-1');

    const lowStockSql = sqlFromQueryArg(queryRaw.mock.calls[1]?.[0]);
    expect(lowStockSql).toContain('<=');
    expect(lowStockSql).toContain('min_stock_level > 0');
    expect(summary.lowStockProducts).toHaveLength(1);
    expect(summary.lowStockProducts[0]?.currentStock).toBe(10);
    expect(summary.lowStockProducts[0]?.minStockLevel).toBe(10);
  });

  it('top products use unit cost from stock_summary for stock value ranking', async () => {
    const { service, queryRaw, user } = makeService();

    queryRaw
      .mockResolvedValueOnce([
        {
          total_value: '1500',
          low_count: '0',
          critical_count: '0',
          warning_count: '0',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'prod-1',
          product_code: 'SKU-1',
          description: 'Widget',
          category: 'General',
          current_stock: '10',
          unit_cost: '50',
          stock_value: '500',
        },
      ]);

    const summary = await service.summary(user, 'shop-1');

    const topProductsSql = sqlFromQueryArg(queryRaw.mock.calls[3]?.[0]);
    expect(topProductsSql).toContain('unit_cost');
    expect(topProductsSql).toContain('s.avg_cost');
    expect(topProductsSql).not.toContain('selling_price');
    expect(summary.topProducts[0]).toEqual(
      expect.objectContaining({
        unitCost: 50,
        stockValue: 500,
        currentStock: 10,
      }),
    );
  });

  it('recentTransactions sums posted GR and GI counts from last 30 days', async () => {
    const { service, queryRaw, user } = makeService();

    queryRaw
      .mockResolvedValueOnce([
        {
          total_value: '0',
          low_count: '0',
          critical_count: '0',
          warning_count: '0',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const summary = await service.summary(user, 'shop-1');
    expect(summary.recentTransactions).toBe(5);
    expect(summary.kpiContext.transactionsPriorPeriod).toBe(5);
  });
});

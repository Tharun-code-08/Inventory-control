import { CostingMethod, Prisma } from '@prisma/client';
import { CostingService } from './costing.service';

/**
 * In-memory mock of the Prisma transaction client surface that CostingService
 * touches. Strongly-typed where reasonable; the rest is `any` because the
 * Prisma generated types are vast and this test only exercises a fixed slice.
 */
function buildTx() {
  type Layer = {
    id: string;
    shopId: string;
    productId: string;
    qtyRemaining: Prisma.Decimal;
    qtyOriginal: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    createdAt: Date;
  };

  type Summary = {
    shopId: string;
    productId: string;
    currentStock: Prisma.Decimal;
    avgCost: Prisma.Decimal;
  };

  const layers: Layer[] = [];
  const summary = new Map<string, Summary>();

  function key(shopId: string, productId: string) {
    return `${shopId}:${productId}`;
  }

  let nextLayerId = 1;
  let nextCreatedAt = Date.now();

  const tx = {
    costLayer: {
      create: jest.fn(async ({ data }: any) => {
        const layer: Layer = {
          id: `layer-${nextLayerId++}`,
          shopId: data.shopId,
          productId: data.productId,
          qtyRemaining: new Prisma.Decimal(data.qtyRemaining),
          qtyOriginal: new Prisma.Decimal(data.qtyOriginal),
          unitCost: new Prisma.Decimal(data.unitCost),
          createdAt: new Date(nextCreatedAt++),
        };
        layers.push(layer);
        return layer;
      }),
      findMany: jest.fn(async ({ where, orderBy }: any) => {
        let results = layers.filter(
          (l) =>
            l.shopId === where.shopId &&
            l.productId === where.productId &&
            (!where.qtyRemaining || l.qtyRemaining.gt(where.qtyRemaining.gt)),
        );
        if (orderBy?.createdAt === 'asc') {
          results = [...results].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return results;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const layer = layers.find((l) => l.id === where.id);
        if (!layer) throw new Error('layer not found');
        if (data.qtyRemaining !== undefined) {
          layer.qtyRemaining = new Prisma.Decimal(data.qtyRemaining);
        }
        return layer;
      }),
    },
    stockSummary: {
      findUnique: jest.fn(async ({ where }: any) => {
        const k = key(where.shopId_productId.shopId, where.shopId_productId.productId);
        return summary.get(k) ?? null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const k = key(where.shopId_productId.shopId, where.shopId_productId.productId);
        const cur = summary.get(k);
        if (!cur) throw new Error('summary not found');
        if (data.avgCost !== undefined) cur.avgCost = new Prisma.Decimal(data.avgCost);
        return cur;
      }),
    },
  };

  function seedSummary(shopId: string, productId: string, qty: number, avg: number) {
    summary.set(key(shopId, productId), {
      shopId,
      productId,
      currentStock: new Prisma.Decimal(qty),
      avgCost: new Prisma.Decimal(avg),
    });
  }

  return { tx, layers, summary, seedSummary };
}

describe('CostingService', () => {
  const SHOP = '00000000-0000-0000-0000-000000000001';
  const PRODUCT = '00000000-0000-0000-0000-000000000002';

  it('rolls up weighted-average cost on inflow', async () => {
    const svc = new CostingService();
    const { tx, seedSummary, summary } = buildTx();
    seedSummary(SHOP, PRODUCT, 10, 5); // 10 units @ $5 = $50

    await svc.recordInflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(10),
      unitCost: new Prisma.Decimal(7), // 10 units @ $7 = $70
      method: CostingMethod.AVERAGE,
    });

    const row = summary.get(`${SHOP}:${PRODUCT}`);
    // (10*5 + 10*7) / 20 = 6
    expect(row!.avgCost.toFixed(4)).toBe('6.0000');
  });

  it('uses unit cost when summary starts empty', async () => {
    const svc = new CostingService();
    const { tx, seedSummary, summary } = buildTx();
    seedSummary(SHOP, PRODUCT, 0, 0);

    await svc.recordInflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(5),
      unitCost: new Prisma.Decimal(8),
      method: CostingMethod.AVERAGE,
    });
    const row = summary.get(`${SHOP}:${PRODUCT}`);
    expect(row!.avgCost.toFixed(4)).toBe('8.0000');
  });

  it('FIFO: consumes oldest layer first and reports unit cost', async () => {
    const svc = new CostingService();
    const { tx, seedSummary } = buildTx();
    seedSummary(SHOP, PRODUCT, 30, 0);

    await svc.recordInflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(10),
      unitCost: new Prisma.Decimal(4),
      method: CostingMethod.FIFO,
    });
    await svc.recordInflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(10),
      unitCost: new Prisma.Decimal(6),
      method: CostingMethod.FIFO,
    });
    await svc.recordInflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(10),
      unitCost: new Prisma.Decimal(8),
      method: CostingMethod.FIFO,
    });

    // Outflow 15 units => 10 @ 4 + 5 @ 6 = 70
    const out = await svc.recordOutflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(15),
      method: CostingMethod.FIFO,
    });
    expect(out.totalCost.toFixed(2)).toBe('70.00');
    expect(out.unitCost.toFixed(4)).toBe(
      new Prisma.Decimal(70).div(15).toFixed(4),
    );
  });

  it('AVERAGE outflow uses summary.avgCost', async () => {
    const svc = new CostingService();
    const { tx, seedSummary } = buildTx();
    seedSummary(SHOP, PRODUCT, 100, 12.5);
    const out = await svc.recordOutflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(8),
      method: CostingMethod.AVERAGE,
    });
    expect(out.unitCost.toFixed(4)).toBe('12.5000');
    expect(out.totalCost.toFixed(2)).toBe('100.00');
  });

  it('zero-qty outflow returns zero without touching layers', async () => {
    const svc = new CostingService();
    const { tx } = buildTx();
    const out = await svc.recordOutflow(tx as any, {
      shopId: SHOP,
      productId: PRODUCT,
      qty: new Prisma.Decimal(0),
      method: CostingMethod.FIFO,
    });
    expect(out.totalCost.toString()).toBe('0');
    expect(out.unitCost.toString()).toBe('0');
    expect(tx.costLayer.findMany).not.toHaveBeenCalled();
  });
});

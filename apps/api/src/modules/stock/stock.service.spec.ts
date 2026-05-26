import { Prisma } from '@prisma/client';
import { StockService } from './stock.service';

describe('StockService.resolveBalance', () => {
  it('uses ledger net balance when ledger rows exist', async () => {
    const prisma = {
      stockLedger: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { inQty: new Prisma.Decimal(50), outQty: new Prisma.Decimal(8) },
          _count: { _all: 3 },
        }),
      },
      stockSummary: {
        findUnique: jest.fn().mockResolvedValue({ currentStock: new Prisma.Decimal(0) }),
      },
    } as any;

    const service = new StockService(prisma);
    const balance = await service.resolveBalance(prisma, 'shop-1', 'prod-1');

    expect(balance.toString()).toBe('42');
    expect(prisma.stockSummary.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to stock summary when no ledger rows exist', async () => {
    const prisma = {
      stockLedger: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { inQty: new Prisma.Decimal(0), outQty: new Prisma.Decimal(0) },
          _count: { _all: 0 },
        }),
      },
      stockSummary: {
        findUnique: jest.fn().mockResolvedValue({ currentStock: new Prisma.Decimal(15) }),
      },
    } as any;

    const service = new StockService(prisma);
    const balance = await service.resolveBalance(prisma, 'shop-1', 'prod-1');

    expect(balance.toString()).toBe('15');
  });
});

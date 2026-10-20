import { Prisma } from '@prisma/client';
import { InventoryLotService } from './inventory-lot.service';

describe('InventoryLotService.consumeFifo', () => {
  function makeTx(lotCount: number) {
    return {
      product: { findUnique: jest.fn() },
      inventoryLot: { count: jest.fn().mockResolvedValue(lotCount) },
    };
  }

  it('issues optional-tracking products on the ledger balance even when lots exist', async () => {
    const service = new InventoryLotService({} as never);
    const allocate = jest.spyOn(service as never, 'allocateFefo' as never);
    const tx = makeTx(1); // a used-up LEGACY backfill lot

    await expect(
      service.consumeFifo(tx as never, 'shop-1', 'prod-1', new Prisma.Decimal(5), {
        product: { expiryTracking: 'OPTIONAL' },
      }),
    ).resolves.toBeUndefined();
    expect(allocate).not.toHaveBeenCalled();
  });

  it('still rejects mandatory-tracking products with no lots', async () => {
    const service = new InventoryLotService({} as never);
    await expect(
      service.consumeFifo(makeTx(0) as never, 'shop-1', 'prod-1', new Prisma.Decimal(5), {
        product: { expiryTracking: 'MANDATORY' },
      }),
    ).rejects.toThrow(/Lot tracking is mandatory/);
  });
});

import { PurchaseOrderStatus, Prisma } from '@prisma/client';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService withLifecycle', () => {
  const service = new PurchaseOrdersService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const withLifecycle = (po: {
    status: PurchaseOrderStatus;
    items: Array<{ productId: string; orderQty: Prisma.Decimal | number }>;
    goodsReceipts?: Array<{ status: string; items?: Array<{ productId: string; quantity: Prisma.Decimal | number }> }>;
    supplierReturns?: Array<{ status: string; items?: Array<{ productId: string; quantity: Prisma.Decimal | number }> }>;
  }) => (service as any).withLifecycle(po);

  it('subtracts posted supplier returns from net received qty', () => {
    const result = withLifecycle({
      status: PurchaseOrderStatus.CONFIRMED,
      items: [{ productId: 'p1', orderQty: new Prisma.Decimal(10) }],
      goodsReceipts: [
        {
          status: 'POSTED',
          items: [{ productId: 'p1', quantity: new Prisma.Decimal(10) }],
        },
      ],
      supplierReturns: [
        {
          status: 'POSTED',
          items: [{ productId: 'p1', quantity: new Prisma.Decimal(4) }],
        },
      ],
    });

    expect(result.lifecycleStatus).toBe('PARTIALLY_RECEIVED');
    expect(Number(result.receiptProgress[0].receivedQty)).toBe(6);
    expect(Number(result.receiptProgress[0].remainingQty)).toBe(4);
  });

  it('returns CONFIRMED when net received is zero after full return', () => {
    const result = withLifecycle({
      status: PurchaseOrderStatus.CONFIRMED,
      items: [{ productId: 'p1', orderQty: new Prisma.Decimal(5) }],
      goodsReceipts: [
        {
          status: 'POSTED',
          items: [{ productId: 'p1', quantity: new Prisma.Decimal(5) }],
        },
      ],
      supplierReturns: [
        {
          status: 'POSTED',
          items: [{ productId: 'p1', quantity: new Prisma.Decimal(5) }],
        },
      ],
    });

    expect(result.lifecycleStatus).toBe('CONFIRMED');
    expect(Number(result.receiptProgress[0].receivedQty)).toBe(0);
  });
});

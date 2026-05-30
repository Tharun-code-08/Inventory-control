import { BadRequestException } from '@nestjs/common';
import { PurchaseOrderStatus, Prisma } from '@prisma/client';
import { assertPoAction } from '../../common/state-machines/assert-action';
import { PurchaseOrderAction } from '../../common/state-machines/document-actions';
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

  it('allows supplier send only for CONFIRMED purchase orders', () => {
    expect(() => assertPoAction(PurchaseOrderStatus.CONFIRMED, PurchaseOrderAction.SEND)).not.toThrow();
    expect(() => assertPoAction(PurchaseOrderStatus.DRAFT, PurchaseOrderAction.SEND)).toThrow(
      BadRequestException,
    );
    expect(() => assertPoAction(PurchaseOrderStatus.CANCELLED, PurchaseOrderAction.SEND)).toThrow(
      BadRequestException,
    );
  });
});

describe('PurchaseOrdersService financial integrity', () => {
  const prisma = {
    goodsReceiptHeader: { count: jest.fn() },
    supplierBillHeader: { count: jest.fn() },
    supplierPayment: { count: jest.fn() },
    supplierReturn: { count: jest.fn() },
  };

  const service = new PurchaseOrdersService(
    prisma as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const existing = {
    supplier: 'Acme',
    rfqId: null,
    shopId: 'shop-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.goodsReceiptHeader.count.mockResolvedValue(0);
    prisma.supplierBillHeader.count.mockResolvedValue(0);
    prisma.supplierPayment.count.mockResolvedValue(0);
    prisma.supplierReturn.count.mockResolvedValue(0);
  });

  it('blocks cancel when supplier bills exist', async () => {
    prisma.supplierBillHeader.count.mockResolvedValue(1);

    await expect(
      (service as any).assertPoMutationAllowed({
        poId: 'po-1',
        action: 'cancel',
        existing,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks supplier change when downstream documents exist', async () => {
    prisma.goodsReceiptHeader.count.mockResolvedValue(2);

    await expect(
      (service as any).assertPoMutationAllowed({
        poId: 'po-1',
        action: 'update',
        existing,
        dto: { supplier: 'Other Supplier' },
      }),
    ).rejects.toThrow(/Cannot change supplier/);
  });

  it('blocks line item changes when downstream documents exist', async () => {
    prisma.supplierPayment.count.mockResolvedValue(1);

    await expect(
      (service as any).assertPoMutationAllowed({
        poId: 'po-1',
        action: 'update',
        existing,
        dto: { items: [{ productId: 'p1', orderQty: 1, rate: 10 }] },
      }),
    ).rejects.toThrow(/Cannot change line items/);
  });
});

describe('PurchaseOrdersService sendToSupplierSafe', () => {
  it('returns a failure payload instead of throwing', async () => {
    const service = new PurchaseOrdersService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service, 'sendToSupplier').mockRejectedValue(new BadRequestException('Supplier email is missing'));

    const result = await service.sendToSupplierSafe({ id: 'user-1' } as any, 'po-1');

    expect(result.sent).toBe(false);
    expect(result.queued).toBe(false);
    expect(result.message).toMatch(/Supplier email is missing/);
  });
});

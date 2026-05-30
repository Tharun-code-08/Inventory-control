import { ConflictException } from '@nestjs/common';
import { DocumentStatus, Prisma, SupplierBillStatus } from '@prisma/client';
import { SupplierBillsService } from './supplier-bills.service';

describe('SupplierBillsService.createFromGoodsReceipt', () => {
  function setup() {
    const tx = {
      $executeRaw: jest.fn(),
      goodsReceiptHeader: { findUnique: jest.fn() },
      supplier: { findUnique: jest.fn(), findFirst: jest.fn() },
      supplierBillHeader: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    };
    const prisma = {
      $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as any;

    const service = new SupplierBillsService(
      prisma,
      { log: jest.fn() } as any,
      { nextNumber: jest.fn().mockResolvedValue('SBILL-001') } as any,
      {} as any,
      { sendSupplierBillEmail: jest.fn() } as any,
    );

    return { service, tx };
  }

  const user = { id: 'user-1', shopId: 'shop-1', companyId: 'co-1' } as any;

  it('rejects billing a draft goods receipt', async () => {
    const { service, tx } = setup();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 'shop-1',
      status: DocumentStatus.DRAFT,
      supplierName: 'Acme',
      items: [
        {
          productId: 'p1',
          quantity: new Prisma.Decimal(1),
          uom: 'pcs',
          purchaseRate: new Prisma.Decimal(10),
          lineValue: new Prisma.Decimal(10),
        },
      ],
      supplierBills: [],
      shop: { id: 'shop-1', companyId: 'co-1' },
    });

    await expect(service.createFromGoodsReceipt(user, 'gr-1')).rejects.toThrow(
      /CREATE_BILL is not allowed in status DRAFT/,
    );
  });

  it('rejects duplicate billing for the same goods receipt', async () => {
    const { service, tx } = setup();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 'shop-1',
      status: DocumentStatus.POSTED,
      grDate: new Date('2026-05-01'),
      supplierName: 'Acme',
      purchaseOrderId: null,
      items: [
        {
          productId: 'p1',
          quantity: new Prisma.Decimal(1),
          uom: 'pcs',
          purchaseRate: new Prisma.Decimal(10),
          lineValue: new Prisma.Decimal(10),
        },
      ],
      supplierBills: [{ id: 'bill-1', status: SupplierBillStatus.ISSUED }],
      shop: { id: 'shop-1', companyId: 'co-1' },
    });
    tx.supplierBillHeader.count.mockResolvedValue(1);
    tx.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });

    await expect(service.createFromGoodsReceipt(user, 'gr-1')).rejects.toThrow(ConflictException);
  });
});

describe('SupplierBillsService.voidBill', () => {
  function setup() {
    const tx = {
      supplierBillHeader: {
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      supplierPayment: { count: jest.fn().mockResolvedValue(0) },
      supplierBillHeader: {
        findUnique: jest.fn(),
      },
    } as any;

    const service = new SupplierBillsService(
      prisma,
      { log: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, prisma, tx };
  }

  const user = { id: 'user-1', shopId: 'shop-1', companyId: 'co-1' } as any;

  it('voids an unpaid issued bill', async () => {
    const { service, prisma, tx } = setup();
    jest.spyOn(service, 'get').mockResolvedValue({
      id: 'bill-1',
      shopId: 'shop-1',
      status: SupplierBillStatus.ISSUED,
      paidValue: new Prisma.Decimal(0),
    } as any);
    prisma.supplierBillHeader.findUnique.mockResolvedValue({ paidValue: new Prisma.Decimal(0) });
    tx.supplierBillHeader.updateMany.mockResolvedValue({ count: 1 });
    tx.supplierBillHeader.findUniqueOrThrow.mockResolvedValue({
      id: 'bill-1',
      status: SupplierBillStatus.VOID,
    });

    const result = await service.voidBill(user, 'bill-1', { reason: 'Duplicate bill' });

    expect(result.status).toBe(SupplierBillStatus.VOID);
    expect(tx.supplierBillHeader.updateMany).toHaveBeenCalled();
  });

  it('blocks void when payments exist', async () => {
    const { service, prisma } = setup();
    jest.spyOn(service, 'get').mockResolvedValue({
      id: 'bill-1',
      shopId: 'shop-1',
      status: SupplierBillStatus.ISSUED,
      paidValue: new Prisma.Decimal(0),
    } as any);
    prisma.supplierPayment.count.mockResolvedValue(1);
    prisma.supplierBillHeader.findUnique.mockResolvedValue({ paidValue: new Prisma.Decimal(100) });

    await expect(service.voidBill(user, 'bill-1')).rejects.toThrow(/payment\(s\) exist/);
  });
});

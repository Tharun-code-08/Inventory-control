import { BadRequestException } from '@nestjs/common';
import { Prisma, SupplierBillStatus } from '@prisma/client';
import {
  assertGrMutationAllowed,
  assertSupplierBillMutationAllowed,
  getGrDownstreamLinks,
  grHasOpenBill,
} from './procurement-downstream';

describe('procurement-downstream helpers', () => {
  const prisma = {
    supplierBillHeader: { count: jest.fn() },
    supplierPayment: { count: jest.fn() },
    supplierReturn: { count: jest.fn() },
    supplierBillHeader_findUnique: jest.fn(),
  };

  const db = {
    supplierBillHeader: {
      count: prisma.supplierBillHeader.count,
      findUnique: prisma.supplierBillHeader_findUnique,
    },
    supplierPayment: { count: prisma.supplierPayment.count },
    supplierReturn: { count: prisma.supplierReturn.count },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.supplierBillHeader.count.mockResolvedValue(0);
    prisma.supplierPayment.count.mockResolvedValue(0);
    prisma.supplierReturn.count.mockResolvedValue(0);
    prisma.supplierBillHeader_findUnique.mockResolvedValue({
      paidValue: new Prisma.Decimal(0),
    });
  });

  it('detects GR downstream financial links', async () => {
    prisma.supplierBillHeader.count.mockResolvedValue(1);

    const links = await getGrDownstreamLinks(db, 'gr-1');

    expect(links.hasFinancialLinks).toBe(true);
    expect(links.supplierBillCount).toBe(1);
  });

  it('blocks GR delete when bills exist', async () => {
    prisma.supplierBillHeader.count.mockResolvedValue(1);

    await expect(
      assertGrMutationAllowed(db, { grId: 'gr-1', action: 'delete' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks supplier bill void when payments exist', async () => {
    prisma.supplierPayment.count.mockResolvedValue(2);
    prisma.supplierBillHeader_findUnique.mockResolvedValue({
      paidValue: new Prisma.Decimal(100),
    });

    await expect(
      assertSupplierBillMutationAllowed(db, { billId: 'bill-1', action: 'void' }),
    ).rejects.toThrow(/payment\(s\) exist/);
  });

  it('detects open bills using non-void statuses', async () => {
    prisma.supplierBillHeader.count.mockImplementation(async (args: any) => {
      expect(args.where.goodsReceiptId).toBe('gr-1');
      expect(args.where.status.in).toEqual([
        SupplierBillStatus.DRAFT,
        SupplierBillStatus.ISSUED,
        SupplierBillStatus.PARTIALLY_PAID,
        SupplierBillStatus.PAID,
      ]);
      return 0;
    });

    await expect(grHasOpenBill(db, 'gr-1')).resolves.toBe(false);
  });
});

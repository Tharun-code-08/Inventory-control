import { ConflictException } from '@nestjs/common';
import { Prisma, SupplierBillStatus } from '@prisma/client';
import { SupplierPaymentsService } from './supplier-payments.service';

describe('SupplierPaymentsService.reverse', () => {
  function setup() {
    const tx = {
      supplierPayment: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      supplierBillHeader: {
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as any;

    const service = new SupplierPaymentsService(
      prisma,
      { log: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, tx };
  }

  const user = { id: 'user-1', shopId: 'shop-1' } as any;

  it('reverses a payment and restores bill to ISSUED when fully unpaid', async () => {
    const { service, tx } = setup();
    tx.supplierPayment.findUnique.mockResolvedValue({
      id: 'pay-1',
      shopId: 'shop-1',
      amount: new Prisma.Decimal(100),
      supplierBill: {
        id: 'bill-1',
        status: SupplierBillStatus.PAID,
        totalValue: new Prisma.Decimal(100),
        paidValue: new Prisma.Decimal(100),
      },
    });
    tx.supplierBillHeader.updateMany.mockResolvedValue({ count: 1 });
    tx.supplierPayment.delete.mockResolvedValue({ id: 'pay-1' });

    const result = await service.reverse(user, 'pay-1');

    expect(result.status).toBe(SupplierBillStatus.ISSUED);
    expect(result.paidValue).toBe('0');
    expect(tx.supplierPayment.delete).toHaveBeenCalledWith({ where: { id: 'pay-1' } });
  });

  it('returns conflict when bill paidValue changed concurrently', async () => {
    const { service, tx } = setup();
    tx.supplierPayment.findUnique.mockResolvedValue({
      id: 'pay-1',
      shopId: 'shop-1',
      amount: new Prisma.Decimal(50),
      supplierBill: {
        id: 'bill-1',
        status: SupplierBillStatus.PARTIALLY_PAID,
        totalValue: new Prisma.Decimal(100),
        paidValue: new Prisma.Decimal(50),
      },
    });
    tx.supplierBillHeader.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.reverse(user, 'pay-1')).rejects.toThrow(ConflictException);
  });
});

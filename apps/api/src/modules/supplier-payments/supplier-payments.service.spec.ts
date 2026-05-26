import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName, SupplierBillStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { SupplierPaymentsService } from './supplier-payments.service';

type Mock = jest.Mock;

function makePrismaWithTx(txMock: any) {
  return {
    $transaction: async (fn: (tx: any) => any) => fn(txMock),
  } as any;
}

function buildTx(overrides: Partial<Record<string, any>> = {}) {
  return {
    supplierBillHeader: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    supplierPayment: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    idempotencyKey: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    ...overrides,
  };
}

const adminUser: RequestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: null,
  companyId: 'co-1',
  tenantShopIds: ['shop-1'],
  permissions: [],
};

function makeSupplierPaymentsService(
  prisma: any,
  audit = makeAudit(),
  numbers = makeNumbers(),
) {
  return new SupplierPaymentsService(prisma, audit as any, numbers as any);
}

function makeAudit(): { log: Mock } {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeNumbers(paymentNumber = 'SPAY-202605-00001'): { nextNumber: Mock } {
  return { nextNumber: jest.fn().mockResolvedValue(paymentNumber) };
}

describe('SupplierPaymentsService.create', () => {
  it('rejects non-positive amounts before opening a transaction', async () => {
    const tx = buildTx();
    const prisma = makePrismaWithTx(tx);
    const service = makeSupplierPaymentsService(prisma);

    await expect(
      service.create(adminUser, {
        supplierBillId: 'bill-1',
        amount: 0,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when supplier bill is missing', async () => {
    const tx = buildTx();
    tx.supplierBillHeader.findUnique.mockResolvedValue(null);
    const prisma = makePrismaWithTx(tx);
    const service = makeSupplierPaymentsService(prisma);

    await expect(
      service.create(adminUser, { supplierBillId: 'bill-missing', amount: 10 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects payments on voided supplier bills', async () => {
    const tx = buildTx();
    tx.supplierBillHeader.findUnique.mockResolvedValue({
      id: 'bill-1',
      shopId: 'shop-1',
      status: SupplierBillStatus.VOID,
      totalValue: new Prisma.Decimal('100.00'),
      paidValue: new Prisma.Decimal('0.00'),
    });
    const prisma = makePrismaWithTx(tx);
    const service = makeSupplierPaymentsService(prisma);

    await expect(
      service.create(adminUser, { supplierBillId: 'bill-1', amount: 10 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when the conditional updateMany affects 0 rows', async () => {
    const tx = buildTx({
      supplierBillHeader: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'bill-1',
          shopId: 'shop-1',
          status: SupplierBillStatus.ISSUED,
          totalValue: new Prisma.Decimal('100.00'),
          paidValue: new Prisma.Decimal('0.00'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    const prisma = makePrismaWithTx(tx);
    const service = makeSupplierPaymentsService(prisma);

    await expect(
      service.create(adminUser, { supplierBillId: 'bill-1', amount: 50 } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('happy path: marks bill PAID, allocates SPAY number, audits, and stores idempotent result', async () => {
    const audit = makeAudit();
    const numbers = makeNumbers('SPAY-202605-00007');
    const tx = buildTx({
      supplierBillHeader: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'bill-1',
          shopId: 'shop-1',
          status: SupplierBillStatus.ISSUED,
          totalValue: new Prisma.Decimal('100.00'),
          paidValue: new Prisma.Decimal('0.00'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      supplierPayment: {
        create: jest.fn().mockResolvedValue({
          id: 'pay-1',
          paymentNumber: 'SPAY-202605-00007',
          supplierBillId: 'bill-1',
          amount: new Prisma.Decimal('100.00'),
        }),
        findUnique: jest.fn(),
      },
    });
    const prisma = makePrismaWithTx(tx);
    const service = makeSupplierPaymentsService(prisma, audit, numbers);

    const result = await service.create(adminUser, {
      supplierBillId: 'bill-1',
      amount: 100,
      idempotencyKey: 'idem-1',
    } as any);

    expect(numbers.nextNumber).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ docType: 'SPAY', prefix: 'SPAY' }),
    );
    expect(tx.supplierBillHeader.updateMany).toHaveBeenCalledTimes(1);
    const updateArg = tx.supplierBillHeader.updateMany.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'bill-1', paidValue: new Prisma.Decimal('0.00') });
    expect(updateArg.data.status).toBe(SupplierBillStatus.PAID);
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyKey.upsert).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('pay-1');
  });
});

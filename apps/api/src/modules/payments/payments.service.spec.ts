import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma, RoleName } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { PaymentsService } from './payments.service';

type Mock = jest.Mock;

function makePrismaWithTx(txMock: any) {
  return {
    $transaction: async (fn: (tx: any) => any) => fn(txMock),
  } as any;
}

function buildTx(overrides: Partial<Record<string, any>> = {}) {
  return {
    invoiceHeader: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    paymentReceipt: {
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

const subscriptions = () =>
  ({
    assertFeatureForShop: jest.fn().mockResolvedValue(undefined),
  }) as any;

function makePaymentsService(prisma: any, audit = makeAudit(), numbers = makeNumbers()) {
  return new PaymentsService(
    prisma,
    audit as any,
    numbers as any,
    subscriptions(),
    emailNotifications(),
    mail(),
  );
}

const emailNotifications = () =>
  ({
    prepareTemplateForShop: jest.fn(),
  }) as any;
const mail = () =>
  ({
    isConfigured: jest.fn().mockReturnValue(false),
    sendPaymentReceived: jest.fn(),
  }) as any;

const shopUser: RequestUser = {
  id: 'user-shop',
  email: 'shop@example.com',
  role: RoleName.SHOP_USER,
  shopId: 'shop-1',
  permissions: [],
} as unknown as RequestUser;

function makeAudit(): { log: Mock; logTenant: Mock; logPlatform: Mock } {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logTenant: jest.fn().mockResolvedValue(undefined),
    logPlatform: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNumbers(receiptNumber = 'RCPT-202605-00001'): { nextNumber: Mock } {
  return { nextNumber: jest.fn().mockResolvedValue(receiptNumber) };
}

describe('PaymentsService.create', () => {
  it('rejects non-positive amounts before opening a transaction', async () => {
    const tx = buildTx();
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await expect(
      service.create(adminUser, {
        invoiceId: 'inv-1',
        amount: 0,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when invoice is missing', async () => {
    const tx = buildTx();
    tx.invoiceHeader.findUnique.mockResolvedValue(null);
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await expect(
      service.create(adminUser, { invoiceId: 'inv-missing', amount: 10 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects payments on voided invoices', async () => {
    const tx = buildTx();
    tx.invoiceHeader.findUnique.mockResolvedValue({
      id: 'inv-1',
      shopId: 'shop-1',
      status: InvoiceStatus.VOID,
      totalValue: new Prisma.Decimal('100.00'),
      paidValue: new Prisma.Decimal('0.00'),
    });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await expect(
      service.create(adminUser, { invoiceId: 'inv-1', amount: 10 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects amounts exceeding the open balance', async () => {
    const tx = buildTx();
    tx.invoiceHeader.findUnique.mockResolvedValue({
      id: 'inv-1',
      shopId: 'shop-1',
          status: InvoiceStatus.ISSUED,
          totalValue: new Prisma.Decimal('100.00'),
          paidValue: new Prisma.Decimal('80.00'),
        });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await expect(
      service.create(adminUser, { invoiceId: 'inv-1', amount: 25 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when the conditional updateMany affects 0 rows (lost-update race)', async () => {
    const tx = buildTx({
      invoiceHeader: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          shopId: 'shop-1',
          status: InvoiceStatus.ISSUED,
          totalValue: new Prisma.Decimal('100.00'),
          paidValue: new Prisma.Decimal('0.00'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await expect(
      service.create(adminUser, { invoiceId: 'inv-1', amount: 50 } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('happy path: marks invoice PAID, allocates a receipt number, audits, and stores idempotent result', async () => {
    const audit = makeAudit();
    const numbers = makeNumbers('RCPT-202605-00007');
    const tx = buildTx({
      invoiceHeader: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          shopId: 'shop-1',
          status: InvoiceStatus.ISSUED,
          totalValue: new Prisma.Decimal('100.00'),
          paidValue: new Prisma.Decimal('0.00'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentReceipt: {
        create: jest.fn().mockResolvedValue({
          id: 'pay-1',
          receiptNumber: 'RCPT-202605-00007',
          invoiceId: 'inv-1',
          amount: new Prisma.Decimal('100.00'),
        }),
        findUnique: jest.fn(),
      },
    });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma, audit, numbers);

    const result = await service.create(adminUser, {
      invoiceId: 'inv-1',
      amount: 100,
      idempotencyKey: 'idem-1',
    } as any);

    expect(numbers.nextNumber).toHaveBeenCalledTimes(1);
    expect(tx.invoiceHeader.updateMany).toHaveBeenCalledTimes(1);
    const updateArg = tx.invoiceHeader.updateMany.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'inv-1', paidValue: new Prisma.Decimal('0.00') });
    expect(updateArg.data.status).toBe(InvoiceStatus.PAID);
    expect(audit.logTenant).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyKey.upsert).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('pay-1');
  });

  it('returns the cached payment when idempotency key has a stored result', async () => {
    const tx = buildTx({
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({ result: { paymentId: 'pay-old' } }),
        upsert: jest.fn(),
      },
      paymentReceipt: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'pay-old' }),
      },
    });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    const result = await service.create(adminUser, {
      invoiceId: 'inv-1',
      amount: 50,
      idempotencyKey: 'idem-replay',
    } as any);

    expect(result).toEqual({ id: 'pay-old' });
    expect(tx.invoiceHeader.findUnique).not.toHaveBeenCalled();
    expect(tx.paymentReceipt.create).not.toHaveBeenCalled();
  });

  it('blocks shop users from paying invoices in another shop', async () => {
    const tx = buildTx();
    tx.invoiceHeader.findUnique.mockResolvedValue({
      id: 'inv-1',
      shopId: 'shop-OTHER',
      status: InvoiceStatus.ISSUED,
      totalValue: new Prisma.Decimal('100.00'),
      paidValue: new Prisma.Decimal('0.00'),
    });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await expect(
      service.create(shopUser, { invoiceId: 'inv-1', amount: 10 } as any),
    ).rejects.toThrow();
  });

  it('marks invoice PARTIALLY_PAID when payment is less than total', async () => {
    const tx = buildTx({
      invoiceHeader: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          shopId: 'shop-1',
          status: InvoiceStatus.ISSUED,
          totalValue: new Prisma.Decimal('100.00'),
          paidValue: new Prisma.Decimal('20.00'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentReceipt: {
        create: jest.fn().mockResolvedValue({
          id: 'pay-1',
          receiptNumber: 'RCPT-1',
          invoiceId: 'inv-1',
          amount: new Prisma.Decimal('30.00'),
        }),
        findUnique: jest.fn(),
      },
    });
    const prisma = makePrismaWithTx(tx);
    const service = makePaymentsService(prisma);

    await service.create(adminUser, { invoiceId: 'inv-1', amount: 30 } as any);

    const updateArg = tx.invoiceHeader.updateMany.mock.calls[0][0];
    expect(updateArg.data.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(new Prisma.Decimal(updateArg.data.paidValue).toFixed(2)).toBe('50.00');
  });
});

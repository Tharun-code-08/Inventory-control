import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma, RoleName, SalesOrderStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { InvoicesService } from './invoices.service';

const adminUser: RequestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: null,
  companyId: 'co-1',
  tenantShopIds: ['s1'],
  permissions: [],
};

const subscriptions = () =>
  ({
    assertFeatureForShop: jest.fn().mockResolvedValue(undefined),
  }) as any;

function buildTx() {
  return {
    salesOrderHeader: { findUnique: jest.fn() },
    invoiceHeader: { create: jest.fn() },
  };
}

function makePrisma(tx: any) {
  return {
    $transaction: async (fn: (t: any) => any) => fn(tx),
    customer: {
      findUnique: jest.fn().mockResolvedValue({ shopId: 's1' }),
    },
  } as any;
}

function makeInvoicesService(prisma: any, audit = auditFactory(), numbers = numbersFactory()) {
  return new InvoicesService(prisma, audit, numbers, subscriptions());
}

const auditFactory = () => ({ log: jest.fn().mockResolvedValue(undefined) }) as any;
const numbersFactory = (n = 'INV-202605-00001') =>
  ({ nextNumber: jest.fn().mockResolvedValue(n) }) as any;

describe('InvoicesService.create', () => {
  it('rejects when shopId is unavailable', async () => {
    const tx = buildTx();
    const service = makeInvoicesService(makePrisma(tx));
    await expect(
      service.create(adminUser, { customerId: 'c1', totalValue: 10 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when totalValue is negative', async () => {
    const tx = buildTx();
    const service = makeInvoicesService(makePrisma(tx));
    await expect(
      service.create(adminUser, { shopId: 's1', customerId: 'c1', totalValue: -5 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invoicing a DRAFT sales order', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 's1',
      status: SalesOrderStatus.DRAFT,
      invoices: [],
    });
    const service = makeInvoicesService(makePrisma(tx));

    await expect(
      service.create(adminUser, {
        shopId: 's1',
        customerId: 'c1',
        salesOrderId: 'so-1',
        totalValue: 10,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invoicing a CANCELLED sales order', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 's1',
      status: SalesOrderStatus.CANCELLED,
      invoices: [],
    });
    const service = makeInvoicesService(makePrisma(tx));

    await expect(
      service.create(adminUser, {
        shopId: 's1',
        customerId: 'c1',
        salesOrderId: 'so-1',
        totalValue: 10,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invoicing a sales order that already has a non-VOID invoice', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 's1',
      status: SalesOrderStatus.CONFIRMED,
      invoices: [{ id: 'inv-existing', status: InvoiceStatus.ISSUED }],
    });
    const service = makeInvoicesService(makePrisma(tx));

    await expect(
      service.create(adminUser, {
        shopId: 's1',
        customerId: 'c1',
        salesOrderId: 'so-1',
        totalValue: 10,
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when sales order belongs to a different shop', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.findUnique.mockResolvedValue({
      id: 'so-1',
      shopId: 'OTHER',
      status: SalesOrderStatus.CONFIRMED,
      invoices: [],
    });
    const service = makeInvoicesService(makePrisma(tx));

    await expect(
      service.create(adminUser, {
        shopId: 's1',
        customerId: 'c1',
        salesOrderId: 'so-1',
        totalValue: 10,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports NotFoundException when the referenced sales order is missing', async () => {
    const tx = buildTx();
    tx.salesOrderHeader.findUnique.mockResolvedValue(null);
    const service = makeInvoicesService(makePrisma(tx));

    await expect(
      service.create(adminUser, {
        shopId: 's1',
        customerId: 'c1',
        salesOrderId: 'so-missing',
        totalValue: 10,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('happy path issues an invoiceNumber via DocumentNumberService and audits', async () => {
    const tx = buildTx();
    tx.invoiceHeader.create.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-202605-00001',
      customerId: 'c1',
      totalValue: new Prisma.Decimal('10.00'),
      salesOrderId: null,
    });
    const numbers = numbersFactory('INV-202605-00001');
    const audit = auditFactory();
    const service = makeInvoicesService(makePrisma(tx), audit, numbers);

    const created = await service.create(adminUser, {
      shopId: 's1',
      customerId: 'c1',
      totalValue: 10,
    } as any);

    expect(numbers.nextNumber).toHaveBeenCalledTimes(1);
    expect(tx.invoiceHeader.create).toHaveBeenCalledTimes(1);
    const data = tx.invoiceHeader.create.mock.calls[0][0].data;
    expect(data.invoiceNumber).toBe('INV-202605-00001');
    expect(data.status).toBe(InvoiceStatus.ISSUED);
    expect(new Prisma.Decimal(data.totalValue).toFixed(2)).toBe('10.00');
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log.mock.calls[0][1]).toBe(tx);
    expect(created.id).toBe('inv-1');
  });

  it('honors a client-provided invoiceNumber instead of allocating', async () => {
    const tx = buildTx();
    tx.invoiceHeader.create.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'CUSTOM-1',
      customerId: 'c1',
      totalValue: new Prisma.Decimal('5.00'),
      salesOrderId: null,
    });
    const numbers = numbersFactory();
    const service = makeInvoicesService(makePrisma(tx), auditFactory(), numbers);

    await service.create(adminUser, {
      shopId: 's1',
      customerId: 'c1',
      totalValue: 5,
      invoiceNumber: 'CUSTOM-1',
    } as any);

    expect(numbers.nextNumber).not.toHaveBeenCalled();
    expect(tx.invoiceHeader.create.mock.calls[0][0].data.invoiceNumber).toBe('CUSTOM-1');
  });
});

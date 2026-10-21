import { BadRequestException } from '@nestjs/common';
import { Prisma, RoleName, SalesOrderStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { ReturnsService } from './returns.service';

const user: RequestUser = {
  id: 'u1',
  email: 'u@example.com',
  role: RoleName.ADMIN,
  shopId: 'shop-1',
  companyId: 'co-1',
  tenantShopIds: ['shop-1'],
  permissions: [],
};

function build(overrides: { soQty?: number; returnedQty?: number; soPrice?: number } = {}) {
  const tx = {
    customerReturn: { create: jest.fn().mockResolvedValue({ id: 'r1', returnNumber: 'CRT-1', customerId: 'c1', totalValue: new Prisma.Decimal(10) }) },
  };
  const prisma = {
    customer: { findUnique: jest.fn().mockResolvedValue({ shopId: 'shop-1' }) },
    invoiceHeader: { findUnique: jest.fn() },
    salesOrderHeader: {
      findUnique: jest.fn().mockResolvedValue({
        shopId: 'shop-1',
        customerId: 'c1',
        status: SalesOrderStatus.FULFILLED,
        items: [
          {
            productId: 'p1',
            quantity: new Prisma.Decimal(overrides.soQty ?? 5),
            unitPrice: new Prisma.Decimal(overrides.soPrice ?? 100),
          },
        ],
      }),
    },
    customerReturnItem: {
      groupBy: jest
        .fn()
        .mockResolvedValue([{ productId: 'p1', _sum: { quantity: new Prisma.Decimal(overrides.returnedQty ?? 0) } }]),
    },
    $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  } as any;
  const numbers = { nextConfiguredNumber: jest.fn().mockResolvedValue('CRT-1') } as any;
  const audit = { logTenant: jest.fn() } as any;
  const service = new ReturnsService(prisma, {} as any, {} as any, numbers, audit, { get: jest.fn() } as any, {} as any, {} as any, {} as any);
  return { service, prisma, tx };
}

const dto = (quantity: number, unitPrice = 100) =>
  ({ shopId: 'shop-1', customerId: 'c1', salesOrderId: 'so-1', items: [{ productId: 'p1', quantity, unitPrice }] }) as any;

describe('customer return validation', () => {
  it('accepts a return within the unreturned quantity', async () => {
    const { service, tx } = build({ soQty: 5, returnedQty: 2 });
    await service.createCustomerReturn(user, dto(3));
    expect(tx.customerReturn.create).toHaveBeenCalled();
  });

  it('rejects returning more than was sold minus earlier returns', async () => {
    const { service } = build({ soQty: 5, returnedQty: 4 });
    await expect(service.createCustomerReturn(user, dto(2))).rejects.toThrow('exceeds');
  });

  it('rejects a product that was not on the order', async () => {
    const { service } = build();
    await expect(
      service.createCustomerReturn(user, { ...dto(1), items: [{ productId: 'other', quantity: 1, unitPrice: 1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a price above the sold price', async () => {
    const { service } = build({ soPrice: 100 });
    await expect(service.createCustomerReturn(user, dto(1, 150))).rejects.toThrow('price');
  });

  it('rejects a customer from another shop', async () => {
    const { service, prisma } = build();
    prisma.customer.findUnique.mockResolvedValue({ shopId: 'shop-2' });
    await expect(service.createCustomerReturn(user, dto(1))).rejects.toThrow('Customer must belong');
  });
});

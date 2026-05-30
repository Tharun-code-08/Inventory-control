import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { RfqsService } from './rfqs.service';

describe('RfqsService.assertCanCreatePoFromRfq', () => {
  function setup() {
    const prisma = {
      rfqHeader: { findFirst: jest.fn() },
      rfqSupplier: { findMany: jest.fn() },
      rfqItem: { findMany: jest.fn() },
      purchaseOrderItem: { findMany: jest.fn() },
      purchaseOrderHeader: { count: jest.fn() },
    };
    const service = new RfqsService(prisma as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { service, prisma };
  }

  it('aggregates duplicate rfqItem lines before quantity validation', async () => {
    const { service, prisma } = setup();
    prisma.rfqHeader.findFirst.mockResolvedValue({
      id: 'rfq-1',
      shopId: 'shop-1',
      status: DocumentStatus.POSTED,
    });
    prisma.rfqSupplier.findMany.mockResolvedValue([]);
    prisma.rfqItem.findMany.mockResolvedValue([
      { id: 'item-1', productId: 'prod-1', quantity: new Prisma.Decimal(10) },
    ]);
    prisma.purchaseOrderItem.findMany.mockResolvedValue([
      { rfqItemId: 'item-1', orderQty: new Prisma.Decimal(6) },
    ]);
    prisma.purchaseOrderHeader.count.mockResolvedValue(0);

    await expect(
      service.assertCanCreatePoFromRfq({
        rfqId: 'rfq-1',
        shopId: 'shop-1',
        items: [
          { rfqItemId: 'item-1', orderQty: 3 },
          { rfqItemId: 'item-1', orderQty: 2 },
        ],
      }),
    ).rejects.toThrow('Requested quantity exceeds remaining RFQ quantity');
  });

  it('excludes current PO lines while validating draft updates', async () => {
    const { service, prisma } = setup();
    prisma.rfqHeader.findFirst.mockResolvedValue({
      id: 'rfq-1',
      shopId: 'shop-1',
      status: DocumentStatus.POSTED,
    });
    prisma.rfqSupplier.findMany.mockResolvedValue([]);
    prisma.rfqItem.findMany.mockResolvedValue([
      { id: 'item-1', productId: 'prod-1', quantity: new Prisma.Decimal(10) },
    ]);
    prisma.purchaseOrderItem.findMany.mockImplementation(async (args: any) => {
      const excluded = args?.where?.header?.id?.not;
      if (excluded === 'po-1') {
        return [{ rfqItemId: 'item-1', orderQty: new Prisma.Decimal(1) }];
      }
      return [{ rfqItemId: 'item-1', orderQty: new Prisma.Decimal(8) }];
    });
    prisma.purchaseOrderHeader.count.mockResolvedValue(0);

    await expect(
      service.assertCanCreatePoFromRfq({
        rfqId: 'rfq-1',
        shopId: 'shop-1',
        excludePoHeaderId: 'po-1',
        items: [{ rfqItemId: 'item-1', orderQty: 9 }],
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects PO supplier that is not part of RFQ suppliers', async () => {
    const { service, prisma } = setup();
    prisma.rfqHeader.findFirst.mockResolvedValue({
      id: 'rfq-1',
      shopId: 'shop-1',
      status: DocumentStatus.POSTED,
    });
    prisma.rfqSupplier.findMany.mockResolvedValue([
      { supplier: { supplierName: 'Approved Supplier' } },
    ]);
    prisma.rfqItem.findMany.mockResolvedValue([
      { id: 'item-1', productId: 'prod-1', quantity: new Prisma.Decimal(10) },
    ]);
    prisma.purchaseOrderItem.findMany.mockResolvedValue([]);
    prisma.purchaseOrderHeader.count.mockResolvedValue(0);

    await expect(
      service.assertCanCreatePoFromRfq({
        rfqId: 'rfq-1',
        shopId: 'shop-1',
        supplierName: 'Other Supplier',
        items: [{ rfqItemId: 'item-1', orderQty: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

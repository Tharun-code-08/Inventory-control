import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReturnStatus, SupplierReturnReasonCode } from '@prisma/client';
import { ReturnsService } from './returns.service';

function makeBaseReturn(status: ReturnStatus = ReturnStatus.DRAFT) {
  return {
    id: 'ret-1',
    returnNumber: 'RMO-001',
    returnDate: new Date('2026-05-25'),
    shopId: 'shop-1',
    supplierName: 'Acme Supplies',
    supplierId: 'sup-1',
    purchaseOrderId: 'po-1',
    goodsReceiptId: 'gr-1',
    supplierRef: 'SUP-REF-1',
    reason: null,
    remarks: 'Damaged carton',
    internalCcEmail: 'buyer@example.com',
    status,
    totalValue: new Prisma.Decimal(200),
    postedAt: null,
    submittedAt: null,
    acknowledgedAt: null,
    emailSentAt: null,
    ackTokenHash: 'hashed-token',
    emailMessageId: null,
    createdAt: new Date('2026-05-25'),
    updatedAt: new Date('2026-05-25'),
    createdById: 'user-1',
    updatedById: null,
    shop: {
      id: 'shop-1',
      shopName: 'Main Plant',
      shopNumber: 'P-01',
      email: 'plant@example.com',
      company: { companyName: 'Softdigit Consulting' },
    },
    supplier: {
      id: 'sup-1',
      supplierName: 'Acme Supplies',
      email: 'supplier@example.com',
      city: null,
      state: null,
      country: null,
    },
    purchaseOrder: {
      id: 'po-1',
      poNumber: 'PO-001',
      supplier: 'Acme Supplies',
    },
    goodsReceipt: {
      id: 'gr-1',
      grNumber: 'GR-001',
      grDate: new Date('2026-05-20'),
      supplierName: 'Acme Supplies',
      purchaseOrderId: 'po-1',
    },
    images: [
      {
        id: 'img-header-1',
        returnId: 'ret-1',
        returnItemId: null,
        filePath: 'returns/ret-1/damage.jpg',
        publicUrl: '/uploads/returns/ret-1/damage.jpg',
        originalFilename: 'damage.jpg',
        mimeType: 'image/jpeg',
        createdAt: new Date('2026-05-25'),
        updatedAt: new Date('2026-05-25'),
        createdById: 'user-1',
      },
    ],
    items: [
      {
        id: 'line-1',
        returnId: 'ret-1',
        goodsReceiptItemId: 'gri-1',
        productId: 'prod-1',
        quantity: new Prisma.Decimal(2),
        grnQuantity: new Prisma.Decimal(5),
        uom: 'UNIT',
        unitCost: new Prisma.Decimal(100),
        lineValue: new Prisma.Decimal(200),
        reasonCode: SupplierReturnReasonCode.DAMAGED,
        product: {
          id: 'prod-1',
          productCode: 'P-100',
          description: 'Widget',
        },
        goodsReceiptItem: {
          id: 'gri-1',
          quantity: new Prisma.Decimal(5),
          uom: 'UNIT',
          product: {
            id: 'prod-1',
            productCode: 'P-100',
            description: 'Widget',
          },
        },
        images: [
          {
            id: 'img-item-1',
            returnId: 'ret-1',
            returnItemId: 'line-1',
            filePath: 'returns/ret-1/damage-item.jpg',
            publicUrl: '/uploads/returns/ret-1/damage-item.jpg',
            originalFilename: 'damage-item.jpg',
            mimeType: 'image/jpeg',
            createdAt: new Date('2026-05-25'),
            updatedAt: new Date('2026-05-25'),
            createdById: 'user-1',
          },
        ],
      },
    ],
  } as any;
}

function makeService() {
  const tx = {
    goodsReceiptHeader: { findUnique: jest.fn() },
    supplier: { findFirst: jest.fn() },
    supplierReturn: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    supplierReturnItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    supplierReturnImage: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    shop: { findUnique: jest.fn() },
  } as any;

  const prisma = {
    ...tx,
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  } as any;
  const stock = { postMovementOnce: jest.fn() } as any;
  const costing = { recordOutflow: jest.fn(), recordInflow: jest.fn() } as any;
  const numbers = { nextNumber: jest.fn() } as any;
  const audit = { log: jest.fn() } as any;
  const mail = { sendSupplierReturnNotice: jest.fn() } as any;
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'PUBLIC_WEB_URL') return 'http://localhost:5173';
      return fallback;
    }),
  } as unknown as ConfigService;
  const returnImages = {
    store: jest.fn(),
    remove: jest.fn(),
    read: jest.fn(),
  } as any;

  const service = new ReturnsService(
    prisma,
    stock,
    costing,
    numbers,
    audit,
    mail,
    config,
    returnImages,
    { prepareTemplateForShop: jest.fn() } as any,
  );

  return { service, prisma, tx, stock, costing, numbers, audit, mail, returnImages };
}

describe('ReturnsService', () => {
  it('rejects a supplier return draft when quantity exceeds remaining GR quantity', async () => {
    const { service, tx } = makeService();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 'shop-1',
      status: 'POSTED',
      supplierName: 'Acme Supplies',
      purchaseOrderId: 'po-1',
      shop: {
        id: 'shop-1',
        companyId: 'company-1',
        shopName: 'Main Plant',
        company: { companyName: 'Softdigit Consulting' },
      },
      purchaseOrder: { id: 'po-1', supplier: 'Acme Supplies' },
      items: [
        {
          id: 'gri-1',
          productId: 'prod-1',
          quantity: new Prisma.Decimal(5),
          uom: 'UNIT',
          purchaseRate: new Prisma.Decimal(100),
          product: { id: 'prod-1', productCode: 'P-100', description: 'Widget' },
        },
      ],
    });
    tx.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      supplierName: 'Acme Supplies',
      email: 'supplier@example.com',
    });
    tx.supplierReturnItem.findMany.mockResolvedValue([
      { goodsReceiptItemId: 'gri-1', quantity: new Prisma.Decimal(4) },
    ]);

    await expect(
      service.createSupplierReturn(
        { id: 'user-1', shopId: 'shop-1', role: 'ADMIN', permissions: [] } as any,
        {
          goodsReceiptId: 'gr-1',
          items: [
            {
              goodsReceiptItemId: 'gri-1',
              returnQty: 2,
              reasonCode: SupplierReturnReasonCode.DAMAGED,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits a supplier return email without posting stock movements', async () => {
    const { service, prisma, tx, stock, mail, returnImages } = makeService();
    const draft = makeBaseReturn(ReturnStatus.DRAFT);
    prisma.supplierReturn.findUnique.mockResolvedValue(draft);
    tx.supplierReturn.update.mockResolvedValue({
      ...draft,
      status: ReturnStatus.SUBMITTED,
      submittedAt: new Date(),
      emailSentAt: new Date(),
    });
    mail.sendSupplierReturnNotice.mockResolvedValue({ messageId: 'mail-1' });
    returnImages.read.mockResolvedValue(Buffer.from('image'));

    const result = await service.submitSupplierReturn(
      { id: 'user-1', shopId: 'shop-1', role: 'ADMIN', permissions: [] } as any,
      'ret-1',
    );

    expect(mail.sendSupplierReturnNotice).toHaveBeenCalledTimes(1);
    expect(stock.postMovementOnce).not.toHaveBeenCalled();
    expect(result.status).toBe(ReturnStatus.SUBMITTED);
  });

  it('posts stock only after supplier acknowledgement', async () => {
    const { service, prisma, tx, stock, costing } = makeService();
    const submitted = makeBaseReturn(ReturnStatus.SUBMITTED);
    prisma.supplierReturn.findFirst.mockResolvedValue(submitted);
    tx.supplierReturn.updateMany.mockResolvedValue({ count: 1 });
    tx.shop.findUnique.mockResolvedValue({ costingMethod: 'AVERAGE' });
    costing.recordOutflow.mockResolvedValue({ unitCost: new Prisma.Decimal(100) });
    tx.supplierReturn.update.mockResolvedValue({
      ...submitted,
      status: ReturnStatus.DONE,
      acknowledgedAt: new Date(),
      postedAt: new Date(),
    });

    const result = await service.acknowledgeSupplierReturn('plain-token');

    expect(costing.recordOutflow).toHaveBeenCalledTimes(1);
    expect(stock.postMovementOnce).toHaveBeenCalledTimes(1);
    expect(result.returnOrder.status).toBe(ReturnStatus.DONE);
  });

  it('treats repeated acknowledgement as idempotent', async () => {
    const { service, prisma, stock } = makeService();
    prisma.supplierReturn.findFirst.mockResolvedValue(makeBaseReturn(ReturnStatus.DONE));

    const result = await service.acknowledgeSupplierReturn('plain-token');

    expect(stock.postMovementOnce).not.toHaveBeenCalled();
    expect(result.message).toMatch(/already been acknowledged/i);
  });
});

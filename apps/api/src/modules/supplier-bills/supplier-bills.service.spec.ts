import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, RoleName, SupplierBillStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { SupplierBillsService } from './supplier-bills.service';

const adminUser: RequestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: null,
  companyId: 'co-1',
  tenantShopIds: ['s1'],
  permissions: [],
};

function buildTx() {
  return {
    goodsReceiptHeader: { findUnique: jest.fn() },
    supplier: { findUnique: jest.fn(), findFirst: jest.fn() },
    supplierBillHeader: { create: jest.fn() },
  };
}

function makePrisma(tx: any) {
  return {
    $transaction: async (fn: (t: any) => any) => fn(tx),
  } as any;
}

function makeService(prisma: any, audit = auditFactory(), numbers = numbersFactory()) {
  return new SupplierBillsService(prisma, audit, numbers);
}

const auditFactory = () => ({ log: jest.fn().mockResolvedValue(undefined) }) as any;
const numbersFactory = (n = 'SBILL-202605-00001') =>
  ({ nextNumber: jest.fn().mockResolvedValue(n) }) as any;

describe('SupplierBillsService.createFromGoodsReceipt', () => {
  it('throws NotFoundException when goods receipt is missing', async () => {
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue(null);
    const service = makeService(makePrisma(tx));

    await expect(
      service.createFromGoodsReceipt(adminUser, 'gr-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-POSTED goods receipts', async () => {
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      status: DocumentStatus.DRAFT,
      supplierBills: [],
      items: [],
      shop: { id: 's1', companyId: 'co-1' },
    });
    const service = makeService(makePrisma(tx));

    await expect(
      service.createFromGoodsReceipt(adminUser, 'gr-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when goods receipt already has a non-VOID bill', async () => {
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      status: DocumentStatus.POSTED,
      supplierBills: [{ id: 'bill-1', status: SupplierBillStatus.ISSUED }],
      items: [{ productId: 'p1', quantity: 1, uom: 'EA', purchaseRate: 10, lineValue: 10 }],
      shop: { id: 's1', companyId: 'co-1' },
    });
    const service = makeService(makePrisma(tx));

    await expect(
      service.createFromGoodsReceipt(adminUser, 'gr-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires supplierId when supplier name does not match', async () => {
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grDate: new Date('2026-05-01'),
      supplierName: 'Unknown Supplier',
      purchaseOrderId: 'po-1',
      status: DocumentStatus.POSTED,
      supplierBills: [],
      items: [{ productId: 'p1', quantity: 1, uom: 'EA', purchaseRate: 10, lineValue: 10 }],
      shop: { id: 's1', companyId: 'co-1' },
    });
    tx.supplier.findFirst.mockResolvedValue(null);
    const service = makeService(makePrisma(tx));

    await expect(
      service.createFromGoodsReceipt(adminUser, 'gr-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('happy path creates ISSUED bill with lines from GR items', async () => {
    const tx = buildTx();
    tx.goodsReceiptHeader.findUnique.mockResolvedValue({
      id: 'gr-1',
      shopId: 's1',
      grDate: new Date('2026-05-01'),
      supplierName: 'Acme Corp',
      purchaseOrderId: 'po-1',
      status: DocumentStatus.POSTED,
      supplierBills: [],
      items: [
        {
          productId: 'p1',
          quantity: new Prisma.Decimal('2'),
          uom: 'EA',
          purchaseRate: new Prisma.Decimal('10'),
          lineValue: new Prisma.Decimal('20'),
        },
      ],
      shop: { id: 's1', companyId: 'co-1' },
    });
    tx.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    tx.supplierBillHeader.create.mockResolvedValue({
      id: 'bill-1',
      billNumber: 'SBILL-202605-00001',
      supplierId: 'sup-1',
      totalValue: new Prisma.Decimal('20'),
      goodsReceiptId: 'gr-1',
      purchaseOrderId: 'po-1',
    });
    const numbers = numbersFactory();
    const audit = auditFactory();
    const service = makeService(makePrisma(tx), audit, numbers);

    const created = await service.createFromGoodsReceipt(adminUser, 'gr-1');

    expect(numbers.nextNumber).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ docType: 'SBILL', prefix: 'SBILL' }),
    );
    const data = tx.supplierBillHeader.create.mock.calls[0][0].data;
    expect(data.status).toBe(SupplierBillStatus.ISSUED);
    expect(data.goodsReceiptId).toBe('gr-1');
    expect(data.purchaseOrderId).toBe('po-1');
    expect(data.items.create).toHaveLength(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(created.id).toBe('bill-1');
  });
});

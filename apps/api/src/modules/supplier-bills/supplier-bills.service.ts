import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, DocumentStatus, Prisma, SupplierBillStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import {
  assertShopScope,
  assertSupplierInTenant,
  shopListWhere,
} from '../../common/utils/shop-scope';
import { asMoney, assertNonNegativeMoney, roundMoney } from '../../common/utils/money';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateSupplierBillDto } from './dto/create-supplier-bill.dto';

export type SupplierBillListQuery = {
  shop_id?: string;
  status?: SupplierBillStatus;
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  take?: number;
};

@Injectable()
export class SupplierBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: DocumentNumberService,
  ) {}

  async list(user: RequestUser, query: SupplierBillListQuery = {}) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.SupplierBillHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };
    if (query.status) where.status = query.status;
    if (query.supplier_id) where.supplierId = query.supplier_id;
    if (query.date_from || query.date_to) {
      where.billDate = {};
      if (query.date_from) where.billDate.gte = new Date(query.date_from);
      if (query.date_to) where.billDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.supplierBillHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        status: true,
        totalValue: true,
        paidValue: true,
        purchaseOrderId: true,
        goodsReceiptId: true,
        shopId: true,
        supplierId: true,
        supplier: { select: { id: true, supplierCode: true, supplierName: true } },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async get(user: RequestUser, id: string) {
    const bill = await this.prisma.supplierBillHeader.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        goodsReceipt: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!bill) throw new NotFoundException('Supplier bill not found');
    assertShopScope(user, bill.shopId);
    return bill;
  }

  async createFromGoodsReceipt(
    user: RequestUser,
    goodsReceiptId: string,
    dto: CreateSupplierBillDto = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const gr = await tx.goodsReceiptHeader.findUnique({
        where: { id: goodsReceiptId },
        include: {
          items: true,
          purchaseOrder: true,
          supplierBills: { select: { id: true, status: true } },
          shop: { select: { id: true, companyId: true } },
        },
      });
      if (!gr) throw new NotFoundException('Goods receipt not found');
      assertShopScope(user, gr.shopId);

      if (gr.status !== DocumentStatus.POSTED) {
        throw new BadRequestException('Only POSTED goods receipts can be billed');
      }

      const hasOpenBill = gr.supplierBills.some(
        (bill) => bill.status !== SupplierBillStatus.VOID,
      );
      if (hasOpenBill) {
        throw new ConflictException('This goods receipt has already been billed');
      }

      if (!gr.items.length) {
        throw new BadRequestException('Goods receipt has no line items');
      }

      const companyId = gr.shop.companyId;
      if (!companyId) {
        throw new BadRequestException('Shop not linked to a company');
      }

      let supplierId = dto.supplierId;
      if (supplierId) {
        const supplier = await tx.supplier.findUnique({
          where: { id: supplierId },
          select: { companyId: true },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');
        assertSupplierInTenant(user, supplier.companyId);
      } else {
        const supplierName = gr.supplierName.trim();
        const supplier = await tx.supplier.findFirst({
          where: {
            companyId,
            supplierName: { equals: supplierName, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (!supplier) {
          throw new BadRequestException(
            `Supplier "${supplierName}" not found. Provide supplierId in the request body.`,
          );
        }
        supplierId = supplier.id;
      }

      const billDate = dto.billDate ? new Date(dto.billDate) : gr.grDate;
      const totalValue = roundMoney(
        gr.items.reduce((sum, item) => sum.add(item.lineValue), new Prisma.Decimal(0)),
      );
      assertNonNegativeMoney(totalValue, 'Supplier bill total');

      const billNumber =
        dto.billNumber?.trim() ||
        (await this.numbers.nextNumber(tx, {
          shopId: gr.shopId,
          docType: 'SBILL',
          prefix: 'SBILL',
          date: billDate,
        }));

      const bill = await tx.supplierBillHeader.create({
        data: {
          billNumber,
          billDate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          shopId: gr.shopId,
          supplierId,
          purchaseOrderId: gr.purchaseOrderId,
          goodsReceiptId: gr.id,
          status: SupplierBillStatus.ISSUED,
          totalValue,
          paidValue: new Prisma.Decimal(0),
          remarks: dto.remarks ?? null,
          createdById: user.id,
          items: {
            create: gr.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              uom: item.uom,
              unitCost: item.purchaseRate,
              lineValue: item.lineValue,
            })),
          },
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          goodsReceipt: true,
          items: { include: { product: true } },
        },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'SUPPLIER_BILL',
          entityId: bill.id,
          newValues: {
            billNumber: bill.billNumber,
            supplierId: bill.supplierId,
            totalValue: bill.totalValue.toString(),
            goodsReceiptId: bill.goodsReceiptId,
            purchaseOrderId: bill.purchaseOrderId,
          },
        },
        tx,
      );

      return bill;
    });
  }
}

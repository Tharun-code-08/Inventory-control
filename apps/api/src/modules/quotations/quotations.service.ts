import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateQuotationDto, CreateQuotationItemDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
  ) {}

  async list(user: RequestUser, rfqId?: string) {
    const where: Prisma.SupplierQuotationHeaderWhereInput = {
      ...(rfqId ? { rfqId } : {}),
      ...(user.shopId ? { shopId: user.shopId } : {}),
    };
    return this.prisma.supplierQuotationHeader.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        rfq: true,
        items: { include: { product: true, rfqItem: true } },
      },
    });
  }

  async create(user: RequestUser, dto: CreateQuotationDto) {
    const rfq = await this.prisma.rfqHeader.findUnique({ where: { id: dto.rfqId } });
    if (!rfq) throw new NotFoundException('RFQ not found');
    assertShopScope(user, rfq.shopId);
    const quoteDate = dto.quoteDate ? new Date(dto.quoteDate) : new Date();
    return this.prisma.$transaction(async (tx) => {
      const quoteNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: rfq.shopId,
        docType: 'QUO',
        basePrefix: 'QUO',
        date: quoteDate,
      });
      return tx.supplierQuotationHeader.create({
      data: {
        quoteNumber,
        quoteDate,
        shopId: rfq.shopId,
        rfqId: dto.rfqId,
        supplierId: dto.supplierId,
        notes: dto.notes ?? null,
        status: DocumentStatus.DRAFT,
        createdById: user.id,
        items: {
          create: (dto.items ?? []).map((item: CreateQuotationItemDto) => ({
            rfqItemId: item.rfqItemId ?? null,
            productId: item.productId ?? null,
            description: item.description ?? null,
            quantity: new Prisma.Decimal(item.quantity ?? 0),
            uom: item.uom ?? 'UNIT',
            specifications: item.specifications ?? null,
            unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
            lineValue: new Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
            createdById: user.id,
          })),
        },
      },
      include: {
        supplier: true,
        rfq: true,
        items: { include: { product: true, rfqItem: true } },
      },
    });
    });
  }

  async get(user: RequestUser, id: string) {
    const row = await this.prisma.supplierQuotationHeader.findUnique({
      where: { id },
      include: {
        supplier: true,
        rfq: true,
        items: { include: { product: true, rfqItem: true } },
      },
    });
    if (!row) throw new NotFoundException('Quotation not found');
    assertShopScope(user, row.shopId);
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdateQuotationDto) {
    const row = await this.get(user, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.supplierQuotationItem.deleteMany({ where: { quoteHeaderId: id } });
      return tx.supplierQuotationHeader.update({
        where: { id },
        data: {
          quoteDate: dto.quoteDate ? new Date(dto.quoteDate) : row.quoteDate,
          supplierId: dto.supplierId ?? row.supplierId,
          notes: dto.notes ?? null,
          updatedById: user.id,
          items: {
            create: (dto.items ?? []).map((item: CreateQuotationItemDto) => ({
              rfqItemId: item.rfqItemId ?? null,
              productId: item.productId ?? null,
              description: item.description ?? null,
              quantity: new Prisma.Decimal(item.quantity ?? 0),
              uom: item.uom ?? 'UNIT',
              specifications: item.specifications ?? null,
              unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
              lineValue: new Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
              createdById: user.id,
            })),
          },
        },
        include: {
          supplier: true,
          rfq: true,
          items: { include: { product: true, rfqItem: true } },
        },
      });
    });
  }

  async submit(user: RequestUser, id: string) {
    await this.get(user, id);
    return this.prisma.supplierQuotationHeader.update({
      where: { id },
      data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
    });
  }

  async acceptAndAutoLink(user: RequestUser, id: string) {
    const quote = await this.get(user, id);
    if (quote.items.some((item) => !item.productId)) {
      throw new BadRequestException('All quotation items must reference products for auto-linking');
    }
    return this.prisma.$transaction(async (tx) => {
      const existingContract = await tx.contractHeader.findFirst({ where: { quotationId: quote.id } });
      if (existingContract) {
        const existingPo = await tx.purchaseOrderHeader.findFirst({ where: { contractId: existingContract.id } });
        const existingGr = existingPo
          ? await tx.goodsReceiptHeader.findFirst({ where: { purchaseOrderId: existingPo.id } })
          : null;
        return { quote, contract: existingContract, purchaseOrder: existingPo, goodsReceiptDraft: existingGr, idempotent: true };
      }

      const contractNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: quote.shopId,
        docType: 'CT',
        basePrefix: 'CT',
        date: new Date(),
      });
      const contract = await tx.contractHeader.create({
        data: {
          contractNumber,
          shopId: quote.shopId,
          supplierId: quote.supplierId,
          rfqId: quote.rfqId,
          quotationId: quote.id,
          title: `Auto Contract ${quote.quoteNumber}`,
          startDate: new Date(),
          notes: quote.notes ?? null,
          status: DocumentStatus.POSTED,
          postedAt: new Date(),
          createdById: user.id,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              uom: item.uom,
              unitPrice: item.unitPrice,
              lineValue: item.lineValue,
              createdById: user.id,
            })),
          },
        },
      });

      const poNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: quote.shopId,
        docType: 'PO',
        basePrefix: 'PO',
        date: new Date(),
      });
      const purchaseOrder = await tx.purchaseOrderHeader.create({
        data: {
          poNumber,
          poDate: new Date(),
          shopId: quote.shopId,
          contractId: contract.id,
          supplier: quote.supplier.supplierName,
          status: PurchaseOrderStatus.CONFIRMED,
          remarks: `Auto-generated from quotation ${quote.quoteNumber}`,
          totalValue: quote.items.reduce((sum, it) => sum.add(it.lineValue), new Prisma.Decimal(0)),
          createdById: user.id,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId!,
              currentStock: new Prisma.Decimal(0),
              minStock: new Prisma.Decimal(0),
              suggestedQty: item.quantity,
              orderQty: item.quantity,
              rate: item.unitPrice,
              lineValue: item.lineValue,
              createdById: user.id,
            })),
          },
        },
      });

      const grNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: quote.shopId,
        docType: 'GR',
        basePrefix: 'GR',
        date: new Date(),
      });
      const goodsReceiptDraft = await tx.goodsReceiptHeader.create({
        data: {
          grNumber,
          grDate: new Date(),
          shopId: quote.shopId,
          purchaseOrderId: purchaseOrder.id,
          supplierName: quote.supplier.supplierName,
          supplierRef: purchaseOrder.poNumber,
          remarks: `Auto-draft from PO ${purchaseOrder.poNumber}`,
          status: DocumentStatus.DRAFT,
          createdById: user.id,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId!,
              quantity: item.quantity,
              uom: item.uom,
              purchaseRate: item.unitPrice,
              lineValue: item.lineValue,
              createdById: user.id,
            })),
          },
        },
      });

      const updatedQuote = await tx.supplierQuotationHeader.update({
        where: { id: quote.id },
        data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
      });
      return { quote: updatedQuote, contract, purchaseOrder, goodsReceiptDraft, idempotent: false };
    });
  }
}


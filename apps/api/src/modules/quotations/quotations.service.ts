import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import { DocumentNumberService } from '../stock/document-number.service';
import {
  AcceptAutoLinkQuotationDto,
  AcceptAutoLinkQuotationItemDto,
} from './dto/accept-auto-link-quotation.dto';
import { CreateQuotationDto, CreateQuotationItemDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { RfqsService } from '../rfqs/rfqs.service';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly rfqs: RfqsService,
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

    const invited = await this.prisma.rfqSupplier.findFirst({
      where: { rfqId: dto.rfqId, supplierId: dto.supplierId },
    });
    if (!invited) {
      throw new BadRequestException('Supplier is not invited to this RFQ');
    }

    const existing = await this.prisma.supplierQuotationHeader.findFirst({
      where: { rfqId: dto.rfqId, supplierId: dto.supplierId },
    });
    if (existing) {
      throw new BadRequestException('This supplier already has a quotation for this RFQ');
    }

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

  async acceptAndAutoLink(
    user: RequestUser,
    id: string,
    dto: AcceptAutoLinkQuotationDto = {},
  ) {
    const quote = await this.get(user, id);
    const selectedItems = this.resolveAutoLinkItems(quote.items, dto.items);
    if (selectedItems.some(({ item }) => !item.productId)) {
      throw new BadRequestException('All quotation items must reference products for auto-linking');
    }
    if (quote.rfqId) {
      const missingRfqItem = selectedItems.find(({ item }) => !item.rfqItemId);
      if (missingRfqItem) {
        throw new BadRequestException('Quotation items must reference RFQ lines to create linked purchase orders');
      }
      await this.rfqs.assertCanCreatePoFromRfq({
        rfqId: quote.rfqId,
        shopId: quote.shopId,
        supplierName: quote.supplier.supplierName,
        items: selectedItems.map(({ item, orderQty }) => ({
          rfqItemId: item.rfqItemId!,
          orderQty,
        })),
      });
    }
    return this.prisma.$transaction(async (tx) => {
      if (quote.rfqId) {
        await this.rfqs.assertCanCreatePoFromRfq({
          tx,
          rfqId: quote.rfqId,
          shopId: quote.shopId,
          supplierName: quote.supplier.supplierName,
          items: selectedItems.map(({ item, orderQty }) => ({
            rfqItemId: item.rfqItemId!,
            orderQty,
          })),
        });
      }

      let contract = await tx.contractHeader.findFirst({ where: { quotationId: quote.id } });
      if (!contract) {
        const contractNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
          shopId: quote.shopId,
          docType: 'CT',
          date: new Date(),
        });
        contract = await tx.contractHeader.create({
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
      }

      const selectedTotalValue = selectedItems.reduce(
        (sum, { item, orderQty }) =>
          sum.add(new Prisma.Decimal(orderQty).mul(item.unitPrice)),
        new Prisma.Decimal(0),
      );

      const poNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId: quote.shopId,
        docType: 'PO',
        date: new Date(),
      });
      const purchaseOrder = await tx.purchaseOrderHeader.create({
        data: {
          poNumber,
          poDate: new Date(),
          shopId: quote.shopId,
          rfqId: quote.rfqId,
          contractId: contract.id,
          supplier: quote.supplier.supplierName,
          status: PurchaseOrderStatus.CONFIRMED,
          remarks: `Auto-generated from quotation ${quote.quoteNumber}`,
          totalValue: selectedTotalValue,
          createdById: user.id,
          items: {
            create: selectedItems.map(({ item, orderQty }) => ({
              productId: item.productId!,
              rfqItemId: item.rfqItemId ?? null,
              currentStock: new Prisma.Decimal(0),
              minStock: new Prisma.Decimal(0),
              suggestedQty: new Prisma.Decimal(orderQty),
              orderQty: new Prisma.Decimal(orderQty),
              rate: item.unitPrice,
              lineValue: new Prisma.Decimal(orderQty).mul(item.unitPrice),
              createdById: user.id,
            })),
          },
        },
      });

      const grNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId: quote.shopId,
        docType: 'GR',
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
            create: selectedItems.map(({ item, orderQty }) => ({
              productId: item.productId!,
              quantity: new Prisma.Decimal(orderQty),
              uom: item.uom,
              purchaseRate: item.unitPrice,
              lineValue: new Prisma.Decimal(orderQty).mul(item.unitPrice),
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

  private resolveAutoLinkItems(
    items: Array<{
      id: string;
      rfqItemId: string | null;
      productId: string | null;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      uom: string;
      lineValue: Prisma.Decimal;
      description: string | null;
    }>,
    selection?: AcceptAutoLinkQuotationItemDto[],
  ) {
    if (!selection?.length) {
      return items.map((item) => ({ item, orderQty: Number(item.quantity) }));
    }

    const byItemId = new Map(items.map((item) => [item.id, item]));
    const byRfqItemId = new Map(
      items
        .filter((item) => item.rfqItemId)
        .map((item) => [item.rfqItemId as string, item]),
    );
    const seenItemIds = new Set<string>();

    return selection.map((entry) => {
      const item =
        (entry.quotationItemId ? byItemId.get(entry.quotationItemId) : undefined) ??
        (entry.rfqItemId ? byRfqItemId.get(entry.rfqItemId) : undefined);

      if (!item) {
        throw new BadRequestException('Selected quotation line was not found');
      }
      if (seenItemIds.has(item.id)) {
        throw new BadRequestException('Duplicate quotation line in selection');
      }
      seenItemIds.add(item.id);

      const quotedQty = Number(item.quantity);
      if (entry.orderQty <= 0) {
        throw new BadRequestException('Selected PO quantity must be greater than zero');
      }
      if (entry.orderQty > quotedQty) {
        throw new BadRequestException('Selected PO quantity exceeds the supplier quotation quantity');
      }

      return { item, orderQty: entry.orderQty };
    });
  }
}


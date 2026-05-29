import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { SubmitPortalQuoteDto } from './dto/submit-portal-quote.dto';
import { VerifySupplierDto } from './dto/verify-supplier.dto';
import { SubscriptionService } from '../billing/subscription.service';

@Injectable()
export class SupplierPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  private async resolveSupplier(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      include: { company: true },
      take: 5,
    });

    if (suppliers.length === 0) {
      throw new UnauthorizedException(
        'We could not verify your email. Check that it matches our supplier records.',
      );
    }

    return suppliers[0];
  }

  async verify(dto: VerifySupplierDto) {
    const supplier = await this.resolveSupplier(dto.email);
    if (supplier.companyId) {
      await this.subscriptions.assertFeature(supplier.companyId, 'supplier_portal');
    }

    const openRfqs = await this.prisma.rfqHeader.findMany({
      where: {
        status: DocumentStatus.POSTED,
        suppliers: { some: { supplierId: supplier.id } },
      },
      orderBy: { postedAt: 'desc' },
      select: {
        id: true,
        rfqNumber: true,
        title: true,
        deadline: true,
        rfqDate: true,
      },
    });

    const resolveRfqId = (token: string) => {
      const trimmed = token.trim();
      if (!trimmed) return null;
      if (trimmed.includes('-')) return trimmed;
      const upper = trimmed.toUpperCase();
      const fromOpen = openRfqs.find((r) => r.id.replace(/-/g, '').toUpperCase().startsWith(upper));
      return fromOpen?.id ?? trimmed;
    };

    let selectedRfq: (typeof openRfqs)[number] | null = null;
    if (dto.rfqId) {
      const resolvedId = resolveRfqId(dto.rfqId);
      selectedRfq = openRfqs.find((r) => r.id === resolvedId) ?? null;
      if (!selectedRfq) {
        const linked = await this.prisma.rfqHeader.findFirst({
          where: {
            id: resolvedId ?? dto.rfqId,
            status: DocumentStatus.POSTED,
            suppliers: { some: { supplierId: supplier.id } },
          },
          select: {
            id: true,
            rfqNumber: true,
            title: true,
            deadline: true,
            rfqDate: true,
          },
        });
        if (!linked) {
          throw new NotFoundException('RFQ not found or not available for your company');
        }
        selectedRfq = linked;
      }
    }

    return {
      supplier: {
        id: supplier.id,
        supplierName: supplier.supplierName,
        email: supplier.email,
      },
      openRfqs,
      selectedRfqId: selectedRfq?.id ?? openRfqs[0]?.id ?? null,
    };
  }

  async getRfqForSupplier(rfqId: string, supplierId: string) {
    const rfq = await this.prisma.rfqHeader.findFirst({
      where: {
        id: rfqId,
        status: DocumentStatus.POSTED,
        suppliers: { some: { supplierId } },
      },
      include: {
        shop: { select: { shopName: true } },
        items: {
          include: {
            product: { select: { productCode: true, description: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ not available');
    return rfq;
  }

  async submitQuote(dto: SubmitPortalQuoteDto) {
    const rfq = await this.getRfqForSupplier(dto.rfqId, dto.supplierId);
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
      select: { companyId: true },
    });
    if (supplier?.companyId) {
      await this.subscriptions.assertFeature(supplier.companyId, 'supplier_portal');
    }
    const itemMap = new Map(rfq.items.map((i) => [i.id, i]));

    if (dto.items.length !== rfq.items.length) {
      throw new BadRequestException('Unit price is required for every RFQ line item');
    }

    const lines = dto.items.map((line) => {
      const rfqItem = itemMap.get(line.rfqItemId);
      if (!rfqItem) {
        throw new BadRequestException(`Invalid line item ${line.rfqItemId}`);
      }
      const qty = Number(rfqItem.quantity);
      const unitPrice = line.unitPrice;
      if (!(unitPrice > 0)) {
        throw new BadRequestException(`Unit price must be greater than zero for line ${line.rfqItemId}`);
      }
      return {
        rfqItemId: rfqItem.id,
        productId: rfqItem.productId,
        description: rfqItem.description ?? rfqItem.product?.description ?? null,
        quantity: rfqItem.quantity,
        uom: rfqItem.uom,
        specifications: rfqItem.specifications,
        unitPrice: new Prisma.Decimal(unitPrice),
        lineValue: new Prisma.Decimal(qty * unitPrice),
      };
    });

    const notes = [
      dto.notes?.trim(),
      dto.leadTimeDays != null ? `Lead time: ${Math.round(dto.leadTimeDays)} days` : null,
      'Submitted via supplier portal',
    ]
      .filter(Boolean)
      .join('\n');

    const quoteDate = new Date();
    return this.prisma.$transaction(async (tx) => {
      const quoteNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: rfq.shopId,
        docType: 'QUO',
        basePrefix: 'QUO',
        date: quoteDate,
      });

      const quote = await tx.supplierQuotationHeader.create({
        data: {
          quoteNumber,
          quoteDate,
          shopId: rfq.shopId,
          rfqId: rfq.id,
          supplierId: dto.supplierId,
          notes: notes || null,
          status: DocumentStatus.POSTED,
          postedAt: new Date(),
          items: {
            create: lines.map((line) => ({
              rfqItemId: line.rfqItemId,
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              uom: line.uom,
              specifications: line.specifications,
              unitPrice: line.unitPrice,
              lineValue: line.lineValue,
            })),
          },
        },
        include: { supplier: true, rfq: true, items: true },
      });

      const total = lines.reduce((sum, l) => sum + Number(l.lineValue), 0);
      return {
        quoteNumber: quote.quoteNumber,
        referenceCode: quote.quoteNumber,
        totalValue: total,
        status: quote.status,
      };
    });
  }
}

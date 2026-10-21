import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SalesQuotationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { asMoney, roundMoney } from '../../common/utils/money';
import { RequestQuotationRevisionDto } from './dto/request-quotation-revision.dto';

const quoteInclude = {
  customer: { select: { customerName: true, email: true } },
  shop: { select: { shopName: true, shopNumber: true } },
  items: {
    include: {
      product: { select: { productCode: true, description: true } },
    },
  },
} as const;

@Injectable()
export class QuotationPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async findByToken(portalToken: string) {
    const row = await this.prisma.salesQuotationHeader.findUnique({
      where: { portalToken },
      include: quoteInclude,
    });
    if (!row) throw new NotFoundException('Quotation link is invalid or has expired');
    return row;
  }

  private toPortalView(row: Awaited<ReturnType<typeof this.findByToken>>) {
    const canRespond = row.status === SalesQuotationStatus.SENT;
    return {
      id: row.id,
      quoteNumber: row.quoteNumber,
      quoteDate: row.quoteDate,
      validUntil: row.validUntil,
      status: row.status,
      remarks: row.remarks,
      totalValue: row.totalValue?.toString() ?? '0',
      customerRequestedTotal: row.customerRequestedTotal?.toString() ?? null,
      customerRequestNote: row.customerRequestNote,
      customer: row.customer,
      shop: row.shop,
      canRespond,
      items: row.items.map((item) => ({
        id: item.id,
        productCode: item.product.productCode,
        description: item.product.description,
        quantity: item.quantity.toString(),
        uom: item.uom,
        unitPrice: item.unitPrice.toString(),
        lineValue: item.lineValue.toString(),
      })),
    };
  }

  async getByToken(portalToken: string) {
    const row = await this.findByToken(portalToken);
    return this.toPortalView(row);
  }

  /** The customer can only answer a SENT quotation that has not expired. */
  private assertAwaitingResponse(row: { status: SalesQuotationStatus; validUntil: Date | null }) {
    if (row.status !== SalesQuotationStatus.SENT) {
      throw new BadRequestException('This quotation is no longer awaiting your response');
    }
    if (row.validUntil) {
      const endOfValidDay = new Date(row.validUntil);
      endOfValidDay.setUTCHours(23, 59, 59, 999);
      if (endOfValidDay.getTime() < Date.now()) {
        throw new BadRequestException('This quotation has expired. Please ask for a new quotation.');
      }
    }
  }

  /** Moves a SENT quotation to its next status; a concurrent answer gets a clear error. */
  private async respond(id: string, data: Prisma.SalesQuotationHeaderUpdateManyMutationInput) {
    const claimed = await this.prisma.salesQuotationHeader.updateMany({
      where: { id, status: SalesQuotationStatus.SENT },
      data,
    });
    if (claimed.count === 0) {
      throw new BadRequestException('This quotation is no longer awaiting your response');
    }
    return this.prisma.salesQuotationHeader.findUniqueOrThrow({ where: { id }, include: quoteInclude });
  }

  async accept(portalToken: string) {
    const row = await this.findByToken(portalToken);
    this.assertAwaitingResponse(row);

    const updated = await this.respond(row.id, {
      status: SalesQuotationStatus.ACCEPTED,
      customerRespondedAt: new Date(),
      customerRequestedTotal: null,
      customerRequestNote: null,
    });

    return {
      message: 'Thank you. Your acceptance has been recorded.',
      quotation: this.toPortalView(updated),
    };
  }

  async requestRevision(portalToken: string, dto: RequestQuotationRevisionDto) {
    const row = await this.findByToken(portalToken);
    this.assertAwaitingResponse(row);

    const requested = roundMoney(asMoney(dto.requestedTotal));
    const currentTotal = row.totalValue ?? asMoney(0);
    if (requested.gte(currentTotal)) {
      throw new BadRequestException(
        'Please enter an amount lower than the quoted total if you are requesting revised pricing',
      );
    }

    const updated = await this.respond(row.id, {
      status: SalesQuotationStatus.USER_REQUESTED,
      customerRequestedTotal: requested,
      customerRequestNote: dto.note?.trim() || null,
      customerRespondedAt: new Date(),
    });

    return {
      message:
        'Your pricing feedback has been submitted. Our team will review your request and may send you a revised quotation.',
      quotation: this.toPortalView(updated),
    };
  }
}

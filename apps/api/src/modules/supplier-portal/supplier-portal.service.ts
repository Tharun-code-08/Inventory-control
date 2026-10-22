import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AlertType, DocumentStatus, NotificationModule, NotificationPriority, Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { SubmitPortalQuoteDto } from './dto/submit-portal-quote.dto';
import { RequestPortalLinkDto } from './dto/request-portal-link.dto';
import { verifySupplierPortalToken } from '../../common/crypto/portal-token';
import { MailService } from '../../common/mail/mail.service';
import { rfqInviteHtml, rfqInviteSubject, rfqInviteText } from '../../common/mail/rfq-invite.template';
import { SubscriptionService } from '../billing/subscription.service';
import { NotificationService } from '../notifications/services/notification.service';

@Injectable()
export class SupplierPortalService {
  private readonly logger = new Logger(SupplierPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly subscriptions: SubscriptionService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
  ) {}

  /**
   * Emails a fresh quote link for each open RFQ the address was invited to.
   * The response is the same whether or not the address is a supplier, so it
   * can't be used to discover suppliers, and the email itself is the proof of
   * identity: only the inbox owner receives the link.
   */
  async requestLink(dto: RequestPortalLinkDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: { id: true, supplierName: true, email: true, companyId: true },
      take: 20,
    });

    for (const supplier of suppliers) {
      if (!supplier.companyId || !supplier.email) continue;
      try {
        await this.subscriptions.assertFeature(supplier.companyId, 'supplier_portal');
      } catch {
        continue;
      }
      const rfqs = await this.prisma.rfqHeader.findMany({
        where: {
          status: DocumentStatus.POSTED,
          closedAt: null,
          ...(dto.rfqId ? { id: dto.rfqId } : {}),
          suppliers: { some: { supplierId: supplier.id } },
        },
        orderBy: { postedAt: 'desc' },
        select: { id: true, rfqNumber: true, title: true, deadline: true },
        take: 10,
      });
      for (const rfq of rfqs) {
        if (rfq.deadline && endOfDay(rfq.deadline) < Date.now()) continue;
        const content = this.mail.buildRfqInviteContent({
          rfqId: rfq.id,
          rfqNumber: rfq.rfqNumber,
          rfqTitle: rfq.title,
          deadline: rfq.deadline,
          supplierId: supplier.id,
          supplierName: supplier.supplierName,
        });
        await this.mail
          .sendTenantMail(supplier.companyId, {
            to: supplier.email,
            subject: rfqInviteSubject(content),
            text: rfqInviteText(content),
            html: rfqInviteHtml(content),
          })
          .catch((err: Error) => this.logger.warn(`Supplier portal link email failed: ${err.message}`));
      }
    }

    return {
      ok: true,
      message: 'If this email belongs to an invited supplier, we have sent a link to each open RFQ.',
    };
  }

  /** Resolves a portal link token to its supplier and RFQ, or 401. */
  private async resolveToken(token: string) {
    const claims = verifySupplierPortalToken(token);
    if (!claims) {
      throw new UnauthorizedException('This link is invalid or has expired. Request a new link from the portal.');
    }
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: claims.supplierId, isActive: true, deletedAt: null },
      select: { id: true, supplierName: true, email: true, companyId: true },
    });
    if (!supplier) {
      throw new UnauthorizedException('This link is no longer valid.');
    }
    if (supplier.companyId) {
      await this.subscriptions.assertFeature(supplier.companyId, 'supplier_portal');
    }
    const rfq = await this.prisma.rfqHeader.findFirst({
      where: {
        id: claims.rfqId,
        status: DocumentStatus.POSTED,
        suppliers: { some: { supplierId: supplier.id } },
      },
      // Only what a supplier needs; internal notes and audit columns stay out.
      select: {
        id: true,
        rfqNumber: true,
        title: true,
        rfqDate: true,
        deadline: true,
        closedAt: true,
        shopId: true,
        shop: { select: { shopName: true } },
        items: {
          select: {
            id: true,
            productId: true,
            description: true,
            quantity: true,
            uom: true,
            specifications: true,
            product: { select: { productCode: true, description: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ not available');
    return { supplier, rfq };
  }

  async getSession(token: string) {
    const { supplier, rfq } = await this.resolveToken(token);
    const { shopId: _shopId, ...publicRfq } = rfq;
    return {
      supplier: { supplierName: supplier.supplierName, email: supplier.email },
      rfq: publicRfq,
    };
  }

  async submitQuote(dto: SubmitPortalQuoteDto) {
    const { supplier, rfq } = await this.resolveToken(dto.token);
    const supplierId = supplier.id;
    if (rfq.closedAt) {
      throw new BadRequestException('This RFQ is closed');
    }
    if (rfq.deadline && endOfDay(rfq.deadline) < Date.now()) {
      throw new BadRequestException('The deadline for this RFQ has passed');
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
    const created = await this.prisma.$transaction(async (tx) => {
      // One quote per supplier per RFQ; serialize so a double submit cannot
      // create two (each one burns a number from the buyer's sequence).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rfq-quote:${rfq.id}:${supplierId}`}::text))`;
      const already = await tx.supplierQuotationHeader.findFirst({
        where: { rfqId: rfq.id, supplierId: supplierId },
        select: { id: true },
      });
      if (already) {
        throw new ConflictException('You have already submitted a quote for this RFQ. Contact the buyer to revise it.');
      }

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
          supplierId: supplierId,
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
        supplierName: quote.supplier?.supplierName ?? 'A supplier',
        rfqNumber: quote.rfq?.rfqNumber ?? null,
        rfqId: quote.rfqId,
      };
    });

    // Notify the procurement team that a new bid arrived. The supplier is an
    // external actor (no internal user), so this is a system notification.
    if (supplier?.companyId) {
      const rfqLabel = created.rfqNumber ? created.rfqNumber : 'an RFQ';
      await this.notifications
        .notifyRoles(
          [RoleName.PURCHASE_MANAGER, RoleName.OWNER, RoleName.ADMIN],
          {
            title: 'New Bid Received',
            message: `${created.supplierName} submitted a quote for ${rfqLabel}`,
            type: AlertType.RFQ_RESPONSE_RECEIVED,
            module: NotificationModule.RFQ,
            priority: NotificationPriority.NORMAL,
            referenceType: 'rfq',
            referenceId: created.rfqId,
            deepLink: `/rfqs/${created.rfqId}`,
          },
          supplier.companyId,
          null,
        )
        .catch(() => undefined);
    }

    return {
      quoteNumber: created.quoteNumber,
      referenceCode: created.referenceCode,
      totalValue: created.totalValue,
      status: created.status,
    };
  }
}

function endOfDay(date: Date): number {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end.getTime();
}

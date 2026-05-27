import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { MailService, type RfqInviteDeliverySummary } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { CreateRfqDto, CreateRfqItemDto } from './dto/create-rfq.dto';
import { UpdateRfqDto } from './dto/update-rfq.dto';
import { DocumentNumberService } from '../stock/document-number.service';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { rfqInviteDefaults } from '../email-notifications/email-notifications.outbound';
import { tryRenderDocumentPdfAttachment } from '../../common/pdf/document-email-pdf';

@Injectable()
export class RfqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly mail: MailService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  async list(user: RequestUser) {
    const rfqs = await this.prisma.rfqHeader.findMany({
      where: { shop: shopListWhere(user) },
      orderBy: { createdAt: 'desc' },
      include: {
        shop: true,
        suppliers: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
    const withFulfillment = await Promise.all(
      rfqs.map(async (rfq) => ({
        ...rfq,
        fulfillment: await this.buildFulfillmentSummary(rfq.id, rfq.items),
      })),
    );
    return withFulfillment;
  }

  async create(user: RequestUser, dto: CreateRfqDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    await this.subscriptions.assertFeatureForShop(shopId, 'rfqs');
    const rfqDate = dto.rfqDate ? new Date(dto.rfqDate) : new Date();
    return this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { shopNumber: true },
      });
      if (!shop) {
        throw new BadRequestException('Invalid shopId');
      }

      const rfqNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId,
        docType: 'RFQ',
        date: rfqDate,
      });

      return tx.rfqHeader.create({
        data: {
          rfqNumber,
          rfqDate,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          title: dto.title,
          notes: dto.notes ?? null,
          shopId,
          status: DocumentStatus.DRAFT,
          createdById: user.id,
          suppliers: {
            create: (dto.suppliers ?? []).map((supplierId: string) => ({ supplierId })),
          },
          items: {
            create: (dto.items ?? []).map((item: CreateRfqItemDto) => ({
              productId: item.productId ?? null,
              description: item.description ?? null,
              quantity: new Prisma.Decimal(item.quantity ?? 0),
              uom: item.uom ?? 'UNIT',
              specifications: item.specifications ?? null,
              createdById: user.id,
            })),
          },
        },
        include: {
          shop: true,
          suppliers: { include: { supplier: true } },
          items: { include: { product: true } },
        },
      });
    });
  }

  async get(user: RequestUser, id: string) {
    const rfq = await this.prisma.rfqHeader.findUnique({
      where: { id },
      include: {
        shop: true,
        suppliers: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ not found');
    assertShopScope(user, rfq.shopId);
    await this.subscriptions.assertFeatureForShop(rfq.shopId, 'rfqs');
    const fulfillment = await this.buildFulfillmentSummary(rfq.id, rfq.items);
    return { ...rfq, fulfillment };
  }

  async update(user: RequestUser, id: string, dto: UpdateRfqDto) {
    const existing = await this.get(user, id);
    await this.subscriptions.assertFeatureForShop(existing.shopId, 'rfqs');
    return this.prisma.$transaction(async (tx) => {
      await tx.rfqSupplier.deleteMany({ where: { rfqId: id } });
      await tx.rfqItem.deleteMany({ where: { rfqHeaderId: id } });
      const updated = await tx.rfqHeader.update({
        where: { id },
        data: {
          rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : existing.rfqDate,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          title: dto.title ?? existing.title,
          notes: dto.notes ?? null,
          updatedById: user.id,
          suppliers: {
            create: (dto.suppliers ?? []).map((supplierId: string) => ({ supplierId })),
          },
          items: {
            create: (dto.items ?? []).map((item: CreateRfqItemDto) => ({
              productId: item.productId ?? null,
              description: item.description ?? null,
              quantity: new Prisma.Decimal(item.quantity ?? 0),
              uom: item.uom ?? 'UNIT',
              specifications: item.specifications ?? null,
              createdById: user.id,
            })),
          },
        },
        include: {
          shop: true,
          suppliers: { include: { supplier: true } },
          items: { include: { product: true } },
        },
      });
      return updated;
    });
  }

  private inviteRecipients(
    suppliers: Array<{
      supplierId: string;
      supplier?: { supplierName: string; email: string | null } | null;
    }>,
  ) {
    return suppliers.map((row) => ({
      supplierId: row.supplierId,
      supplierName: row.supplier?.supplierName ?? 'Supplier',
      email: row.supplier?.email ?? '',
    }));
  }

  private assertEmailDelivery(emailDelivery: RfqInviteDeliverySummary) {
    if (!emailDelivery.configured) {
      throw new BadRequestException(
        'Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env, then restart the API.',
      );
    }
    if (emailDelivery.sent === 0) {
      const detail = emailDelivery.results
        .map((r) => (r.error ? `${r.supplierName}: ${r.error}` : r.supplierName))
        .join('; ');
      throw new BadRequestException(
        `No supplier emails were delivered. ${detail || 'Check SMTP settings and supplier email addresses.'}`,
      );
    }
  }

  async send(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    const suppliers = existing.suppliers ?? [];

    if (suppliers.length === 0) {
      throw new BadRequestException('Add at least one supplier before sending the RFQ');
    }

    if (!existing.shop.companyId) {
      throw new BadRequestException('Shop is not linked to a company');
    }

    const companyName = existing.shop.shopName;
    const attachments = await tryRenderDocumentPdfAttachment(
      {
        title: 'Request for Quotation',
        documentNumber: existing.rfqNumber,
        documentDate: existing.deadline
          ? existing.deadline.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : undefined,
        partyLabel: 'RFQ Title',
        partyName: existing.title,
        companyName,
        summaryLines: [
          { label: 'RFQ Number', value: existing.rfqNumber },
          { label: 'Deadline', value: existing.deadline?.toLocaleDateString('en-GB') ?? '—' },
        ],
        tableHeaders: ['Product', 'Qty'],
        tableRows: (existing.items ?? []).map((item) => [
          String(item.product?.description ?? item.productId ?? ''),
          String(item.quantity ?? ''),
        ]),
      },
      'rfq',
    );

    const config = await this.emailNotifications.resolveConfigForShop(existing.shopId);
    const emailDelivery = await this.mail.sendRfqInvites({
      companyId: existing.shop.companyId,
      rfqId: existing.id,
      rfqNumber: existing.rfqNumber,
      rfqTitle: existing.title,
      deadline: existing.deadline,
      recipients: this.inviteRecipients(suppliers),
      shopId: existing.shopId,
      attachments,
      prepareInvite: (content) => {
        const defaults = rfqInviteDefaults(content);
        return this.emailNotifications.prepareTemplate(
          config,
          'rfq_invite',
          { subject: defaults.subject, text: defaults.text, html: defaults.html },
          defaults.context,
        );
      },
    });

    this.assertEmailDelivery(emailDelivery);

    const wasDraft = existing.status === DocumentStatus.DRAFT;
    const rfq = wasDraft
      ? await this.prisma.rfqHeader.update({
          where: { id },
          data: {
            status: DocumentStatus.POSTED,
            postedAt: new Date(),
            updatedById: user.id,
            notes: `${existing.notes ?? ''}\n[Sent ${new Date().toISOString()}]`.trim(),
          },
          include: {
            shop: true,
            suppliers: { include: { supplier: true } },
            items: { include: { product: true } },
          },
        })
      : await this.prisma.rfqHeader.findUniqueOrThrow({
          where: { id },
          include: {
            shop: true,
            suppliers: { include: { supplier: true } },
            items: { include: { product: true } },
          },
        });

    return { ...rfq, emailDelivery };
  }

  async resendInvites(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    if (existing.status !== DocumentStatus.POSTED) {
      throw new BadRequestException('Only sent RFQs can resend supplier invitations');
    }

    const suppliers = existing.suppliers ?? [];
    if (suppliers.length === 0) {
      throw new BadRequestException('This RFQ has no suppliers');
    }

    if (!existing.shop.companyId) {
      throw new BadRequestException('Shop is not linked to a company');
    }

    const config = await this.emailNotifications.resolveConfigForShop(existing.shopId);
    const emailDelivery = await this.mail.sendRfqInvites({
      companyId: existing.shop.companyId,
      rfqId: existing.id,
      rfqNumber: existing.rfqNumber,
      rfqTitle: existing.title,
      deadline: existing.deadline,
      recipients: this.inviteRecipients(suppliers),
      shopId: existing.shopId,
      prepareInvite: (content) => {
        const defaults = rfqInviteDefaults(content);
        return this.emailNotifications.prepareTemplate(
          config,
          'rfq_invite',
          { subject: defaults.subject, text: defaults.text, html: defaults.html },
          defaults.context,
        );
      },
    });

    this.assertEmailDelivery(emailDelivery);

    return { ...existing, emailDelivery };
  }

  async close(user: RequestUser, id: string) {
    await this.get(user, id);
    return this.prisma.rfqHeader.update({
      where: { id },
      data: {
        notes: `[Closed ${new Date().toISOString()}]`,
        updatedById: user.id,
      },
    });
  }

  async deletionImpact(user: RequestUser, id: string) {
    await this.get(user, id);
    const [quotationCount, contractCount] = await Promise.all([
      this.prisma.supplierQuotationHeader.count({ where: { rfqId: id } }),
      this.prisma.contractHeader.count({ where: { rfqId: id } }),
    ]);
    const canDelete = quotationCount === 0 && contractCount === 0;
    let reason: string | null = null;
    if (quotationCount > 0) {
      reason = `${quotationCount} supplier quotation(s) must be removed first.`;
    } else if (contractCount > 0) {
      reason = `${contractCount} contract(s) are linked to this RFQ.`;
    }
    return { canDelete, quotationCount, contractCount, reason };
  }

  async remove(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    const impact = await this.deletionImpact(user, id);
    if (!impact.canDelete) {
      throw new BadRequestException(
        impact.reason ?? 'This RFQ cannot be deleted because related records exist.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.rfqSupplier.deleteMany({ where: { rfqId: id } }),
      this.prisma.rfqItem.deleteMany({ where: { rfqHeaderId: id } }),
      this.prisma.rfqHeader.delete({ where: { id } }),
    ]);
    return { id, rfqNumber: existing.rfqNumber, deleted: true };
  }

  async fulfillment(user: RequestUser, id: string) {
    const rfq = await this.get(user, id);
    const fulfillment = await this.buildFulfillmentSummary(rfq.id, rfq.items);
    return { rfqId: rfq.id, fulfillment };
  }

  async assertCanCreatePoFromRfq(args: {
    rfqId: string;
    shopId: string;
    items: Array<{ rfqItemId: string; orderQty: number }>;
  }) {
    const rfq = await this.prisma.rfqHeader.findUnique({
      where: { id: args.rfqId },
      select: { id: true, shopId: true, status: true },
    });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.shopId !== args.shopId) {
      throw new BadRequestException('Purchase order must use the same plant as the RFQ');
    }
    if (rfq.status !== DocumentStatus.POSTED) {
      throw new BadRequestException('RFQ must be sent before creating a purchase order');
    }

    const fulfillment = await this.buildFulfillmentSummary(args.rfqId);
    if (fulfillment.posCreated >= fulfillment.maxPos) {
      throw new BadRequestException('All RFQ lines are already allocated to purchase orders');
    }

    const linesMap = new Map(fulfillment.lines.map((l) => [l.rfqItemId, l]));
    for (const line of args.items) {
      const ref = linesMap.get(line.rfqItemId);
      if (!ref) {
        throw new BadRequestException('Invalid rfqItemId on purchase order line');
      }
      if (line.orderQty <= 0) {
        throw new BadRequestException('Order quantity must be greater than zero');
      }
      if (line.orderQty > ref.remainingQty) {
        throw new BadRequestException(
          `Requested quantity exceeds remaining RFQ quantity for item ${ref.productId ?? ref.rfqItemId}`,
        );
      }
    }

    const hasRemainingLine = args.items.some((line) => {
      const ref = linesMap.get(line.rfqItemId);
      return ref && ref.remainingQty > 0;
    });
    if (!hasRemainingLine) {
      throw new BadRequestException('No remaining RFQ quantity available for purchase order');
    }
  }

  private async buildFulfillmentSummary(
    rfqId: string,
    items?: Array<{ id: string; quantity: Prisma.Decimal; productId?: string | null }>,
  ) {
    const rfqItems =
      items ??
      (await this.prisma.rfqItem.findMany({
        where: { rfqHeaderId: rfqId },
        select: { id: true, productId: true, quantity: true },
      }));

    const rfqItemIds = rfqItems.map((i) => i.id);
    const poLines =
      rfqItemIds.length === 0
        ? []
        : await this.prisma.purchaseOrderItem.findMany({
            where: {
              rfqItemId: { in: rfqItemIds },
              header: { rfqId, status: { not: PurchaseOrderStatus.CANCELLED } },
            },
            select: { rfqItemId: true, orderQty: true },
          });

    const orderedByItem = new Map<string, number>();
    for (const line of poLines) {
      const key = line.rfqItemId;
      if (!key) continue;
      const current = orderedByItem.get(key) ?? 0;
      orderedByItem.set(key, current + Number(line.orderQty));
    }

    const lines = rfqItems.map((item) => {
      const orderedQty = orderedByItem.get(item.id) ?? 0;
      const rfqQty = Number(item.quantity);
      const remainingQty = Math.max(0, rfqQty - orderedQty);
      return {
        rfqItemId: item.id,
        productId: item.productId,
        rfqQty,
        orderedQty,
        remainingQty,
      };
    });

    const totalLines = lines.length;
    const linesFullyOrdered = lines.filter((l) => l.remainingQty === 0).length;
    const linesRemaining = totalLines - linesFullyOrdered;
    const maxPos = totalLines;
    const posCreated = await this.prisma.purchaseOrderHeader.count({
      where: { rfqId, status: { not: PurchaseOrderStatus.CANCELLED } },
    });
    const posRemaining = Math.max(0, maxPos - posCreated);

    return {
      totalLines,
      linesFullyOrdered,
      linesRemaining,
      maxPos,
      posCreated,
      posRemaining,
      lines,
    };
  }
}


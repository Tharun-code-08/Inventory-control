import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DocumentStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { assertRfqAction } from '../../common/state-machines/assert-action';
import { assertRfqTransition } from '../../common/state-machines/assert-transition';
import {
  buildDocumentActionAudit,
  buildStatusTransitionAudit,
} from '../../common/state-machines/document-audit';
import { RfqAction } from '../../common/state-machines/document-actions';
import { AuditService } from '../audit/audit.service';
import { MailService, type RfqInviteDeliverySummary } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { shopListWhere } from '../../common/utils/shop-scope';
import { verifyShopInTenant } from '../../common/utils/shop-access';
import { CreateRfqDto, CreateRfqItemDto } from './dto/create-rfq.dto';
import { UpdateRfqDto } from './dto/update-rfq.dto';
import { DocumentNumberService } from '../stock/document-number.service';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { rfqInviteDefaults } from '../email-notifications/email-notifications.outbound';
import { tryRenderDocumentPdfAttachment } from '../../common/pdf/document-email-pdf';

function isUniqueViolationForFields(error: unknown, fields: string[]): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = Array.isArray((error.meta as { target?: unknown })?.target)
    ? ((error.meta as { target?: unknown[] }).target ?? [])
    : [];
  return fields.some((field) => target.includes(field));
}

@Injectable()
export class RfqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly mail: MailService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly audit: AuditService,
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

  private async resolveRfqShopId(user: RequestUser, shopId?: string | null): Promise<string> {
    if (shopId) {
      await verifyShopInTenant(this.prisma, user, shopId);
      return shopId;
    }
    if (user.shopId) {
      await verifyShopInTenant(this.prisma, user, user.shopId);
      return user.shopId;
    }
    if (user.companyId) {
      const shop = await this.prisma.shop.findFirst({
        where: { companyId: user.companyId, isActive: true },
        orderBy: { shopNumber: 'asc' },
        select: { id: true },
      });
      if (shop) return shop.id;
    }
    throw new BadRequestException(
      'No plant is available for RFQ numbering. Add a plant under Master Data first.',
    );
  }

  async create(user: RequestUser, dto: CreateRfqDto) {
    const shopId = await this.resolveRfqShopId(user, dto.shopId ?? user.shopId);
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

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const rfqNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
          shopId,
          docType: 'RFQ',
          date: rfqDate,
        });
        try {
          return await tx.rfqHeader.create({
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
        } catch (error) {
          const canRetry =
            attempt < maxAttempts &&
            isUniqueViolationForFields(error, ['rfq_number', 'rfqNumber']);
          if (canRetry) continue;
          throw error;
        }
      }
      throw new BadRequestException('Unable to reserve a unique RFQ number. Please retry.');
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
    await verifyShopInTenant(this.prisma, user, rfq.shopId);
    await this.subscriptions.assertFeatureForShop(rfq.shopId, 'rfqs');
    const fulfillment = await this.buildFulfillmentSummary(rfq.id, rfq.items);
    return { ...rfq, fulfillment };
  }

  async update(user: RequestUser, id: string, dto: UpdateRfqDto) {
    const existing = await this.get(user, id);
    assertRfqAction(existing.status, RfqAction.EDIT);
    await this.subscriptions.assertFeatureForShop(existing.shopId, 'rfqs');
    const expectedUpdatedAt = dto.ifUnmodifiedSince ? new Date(dto.ifUnmodifiedSince) : null;
    if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
      throw new BadRequestException('Invalid optimistic lock timestamp');
    }
    return this.prisma.$transaction(async (tx) => {
      if (expectedUpdatedAt) {
        const claimed = await tx.rfqHeader.updateMany({
          where: { id, updatedAt: expectedUpdatedAt },
          data: { updatedById: user.id },
        });
        if (claimed.count === 0) {
          throw new ConflictException('RFQ has been modified by another user. Refresh and try again.');
        }
      }

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

  private async buildRfqPdfAttachments(rfq: {
    rfqNumber: string;
    title: string;
    deadline: Date | null;
    shop: { shopName: string };
    items?: Array<{
      productId?: string | null;
      quantity?: Prisma.Decimal | number;
      product?: { description?: string | null } | null;
    }>;
  }) {
    return tryRenderDocumentPdfAttachment(
      {
        title: 'Request for Quotation',
        documentNumber: rfq.rfqNumber,
        documentDate: rfq.deadline
          ? rfq.deadline.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : undefined,
        partyLabel: 'RFQ Title',
        partyName: rfq.title,
        companyName: rfq.shop.shopName,
        summaryLines: [
          { label: 'RFQ Number', value: rfq.rfqNumber },
          { label: 'Deadline', value: rfq.deadline?.toLocaleDateString('en-GB') ?? '—' },
        ],
        tableHeaders: ['Product', 'Qty'],
        tableRows: (rfq.items ?? []).map((item) => [
          String(item.product?.description ?? item.productId ?? ''),
          String(item.quantity ?? ''),
        ]),
      },
      'rfq',
    );
  }

  private skipRfqInviteEmailInTest(): boolean {
    return process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  }

  async send(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    const isFirstSend = existing.status === DocumentStatus.DRAFT;
    assertRfqAction(existing.status, isFirstSend ? RfqAction.POST : RfqAction.SEND);
    const suppliers = existing.suppliers ?? [];

    if (suppliers.length === 0) {
      throw new BadRequestException('Add at least one supplier before sending the RFQ');
    }

    if (!existing.shop.companyId) {
      throw new BadRequestException('Shop is not linked to a company');
    }

    if (this.skipRfqInviteEmailInTest() && isFirstSend) {
      assertRfqTransition(existing.status, DocumentStatus.POSTED);
      const transitioned = await this.prisma.rfqHeader.updateMany({
        where: { id, status: DocumentStatus.DRAFT },
        data: {
          status: DocumentStatus.POSTED,
          postedAt: new Date(),
          updatedById: user.id,
        },
      });
      if (transitioned.count === 0) {
        throw new BadRequestException('RFQ is not in DRAFT state');
      }
      return this.prisma.rfqHeader.findUniqueOrThrow({
        where: { id },
        include: {
          shop: true,
          suppliers: { include: { supplier: true } },
          items: { include: { product: true } },
        },
      });
    }

    const attachments = await this.buildRfqPdfAttachments(existing);

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

    if (isFirstSend) {
      assertRfqTransition(existing.status, DocumentStatus.POSTED);
      const transitioned = await this.prisma.rfqHeader.updateMany({
        where: { id, status: DocumentStatus.DRAFT },
        data: {
          status: DocumentStatus.POSTED,
          postedAt: new Date(),
          updatedById: user.id,
          notes: `${existing.notes ?? ''}\n[Sent ${new Date().toISOString()}]`.trim(),
        },
      });
      if (transitioned.count === 0) {
        throw new BadRequestException('RFQ is not in DRAFT state');
      }
      const rfq = await this.prisma.rfqHeader.findUniqueOrThrow({
        where: { id },
        include: {
          shop: true,
          suppliers: { include: { supplier: true } },
          items: { include: { product: true } },
        },
      });
      await this.audit.log(
        buildStatusTransitionAudit({
          companyId: assertCompanyId(user),
          userId: user.id,
          entityType: 'RFQ',
          entityId: id,
          fromStatus: DocumentStatus.DRAFT,
          toStatus: DocumentStatus.POSTED,
          action: AuditAction.POST,
        }),
      );
      await this.audit.log(
        buildDocumentActionAudit({
          companyId: assertCompanyId(user),
          userId: user.id,
          entityType: 'RFQ',
          entityId: id,
          action: 'POST_RFQ',
          result: 'success',
          detail: { recipients: emailDelivery.sent },
        }),
      );
      return { ...rfq, emailDelivery };
    }

    await this.audit.log(
      buildDocumentActionAudit({
        companyId: assertCompanyId(user),
        userId: user.id,
        entityType: 'RFQ',
        entityId: id,
        action: 'SEND_RFQ',
        result: 'success',
        detail: { recipients: emailDelivery.sent },
      }),
    );

    const rfq = await this.prisma.rfqHeader.findUniqueOrThrow({
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
    assertRfqAction(existing.status, RfqAction.SEND);

    const suppliers = existing.suppliers ?? [];
    if (suppliers.length === 0) {
      throw new BadRequestException('This RFQ has no suppliers');
    }

    if (!existing.shop.companyId) {
      throw new BadRequestException('Shop is not linked to a company');
    }

    const config = await this.emailNotifications.resolveConfigForShop(existing.shopId);
    const attachments = await this.buildRfqPdfAttachments(existing);
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

    await this.audit.log(
      buildDocumentActionAudit({
        companyId: assertCompanyId(user),
        userId: user.id,
        entityType: 'RFQ',
        entityId: id,
        action: 'SEND_RFQ',
        result: 'success',
        detail: { recipients: emailDelivery.sent, resend: true },
      }),
    );

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
    supplierName?: string | null;
    excludePoHeaderId?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db = args.tx ?? this.prisma;
    if (args.tx) {
      await args.tx.$executeRaw`SELECT id FROM rfq_header WHERE id = ${args.rfqId}::uuid FOR UPDATE`;
      await args.tx.$executeRaw`SELECT id FROM rfq_items WHERE rfq_header_id = ${args.rfqId}::uuid FOR UPDATE`;
    }

    const rfq = await db.rfqHeader.findFirst({
      where: { id: args.rfqId, shopId: args.shopId },
      select: { id: true, shopId: true, status: true },
    });
    if (!rfq) {
      throw new NotFoundException('RFQ not found for the selected plant');
    }
    assertRfqAction(rfq.status, RfqAction.CREATE_PO);

    if (args.supplierName?.trim()) {
      const expectedSupplier = args.supplierName.trim().toLowerCase();
      const rfqSuppliers = await db.rfqSupplier.findMany({
        where: { rfqId: args.rfqId },
        select: { supplier: { select: { supplierName: true } } },
      });
      if (
        rfqSuppliers.length > 0 &&
        !rfqSuppliers.some(
          (row) => row.supplier?.supplierName?.trim().toLowerCase() === expectedSupplier,
        )
      ) {
        throw new BadRequestException('Purchase order supplier must match one of the RFQ suppliers');
      }
    }

    const fulfillment = await this.buildFulfillmentSummary(args.rfqId, undefined, {
      tx: args.tx,
      excludePoHeaderId: args.excludePoHeaderId,
    });
    if (fulfillment.posCreated >= fulfillment.maxPos) {
      throw new BadRequestException('All RFQ lines are already allocated to purchase orders');
    }

    const linesMap = new Map(fulfillment.lines.map((l) => [l.rfqItemId, l]));
    const requestedByItem = new Map<string, number>();
    for (const line of args.items) {
      const key = line.rfqItemId?.trim();
      if (!key) {
        throw new BadRequestException('Invalid rfqItemId on purchase order line');
      }
      if (line.orderQty <= 0) {
        throw new BadRequestException('Order quantity must be greater than zero');
      }
      requestedByItem.set(key, (requestedByItem.get(key) ?? 0) + line.orderQty);
    }

    for (const [rfqItemId, orderQty] of requestedByItem.entries()) {
      const ref = linesMap.get(rfqItemId);
      if (!ref) {
        throw new BadRequestException('Invalid rfqItemId on purchase order line');
      }
      if (orderQty > ref.remainingQty) {
        throw new BadRequestException(
          `Requested quantity exceeds remaining RFQ quantity for item ${ref.productId ?? ref.rfqItemId}`,
        );
      }
    }

    if (requestedByItem.size === 0) {
      throw new BadRequestException('No remaining RFQ quantity available for purchase order');
    }
  }

  private async buildFulfillmentSummary(
    rfqId: string,
    items?: Array<{ id: string; quantity: Prisma.Decimal; productId?: string | null }>,
    options?: { tx?: Prisma.TransactionClient; excludePoHeaderId?: string },
  ) {
    const db = options?.tx ?? this.prisma;
    const rfqItems =
      items ??
      (await db.rfqItem.findMany({
        where: { rfqHeaderId: rfqId },
        select: { id: true, productId: true, quantity: true },
      }));

    const rfqItemIds = rfqItems.map((i) => i.id);
    const poLines =
      rfqItemIds.length === 0
        ? []
        : await db.purchaseOrderItem.findMany({
            where: {
              rfqItemId: { in: rfqItemIds },
              header: {
                rfqId,
                status: { not: PurchaseOrderStatus.CANCELLED },
                ...(options?.excludePoHeaderId ? { id: { not: options.excludePoHeaderId } } : {}),
              },
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
    const posCreated = await db.purchaseOrderHeader.count({
      where: {
        rfqId,
        status: { not: PurchaseOrderStatus.CANCELLED },
        ...(options?.excludePoHeaderId ? { id: { not: options.excludePoHeaderId } } : {}),
      },
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


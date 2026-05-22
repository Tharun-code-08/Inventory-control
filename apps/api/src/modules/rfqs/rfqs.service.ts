import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { MailService, type RfqInviteDeliverySummary } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { CreateRfqDto, CreateRfqItemDto } from './dto/create-rfq.dto';
import { UpdateRfqDto } from './dto/update-rfq.dto';
import { DocumentNumberService } from '../stock/document-number.service';

@Injectable()
export class RfqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly mail: MailService,
  ) {}

  async list(user: RequestUser) {
    const scopedShop = defaultShopFilter(user);
    return this.prisma.rfqHeader.findMany({
      where: scopedShop ? { shopId: scopedShop } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: true,
        suppliers: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
  }

  async create(user: RequestUser, dto: CreateRfqDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    const rfqDate = dto.rfqDate ? new Date(dto.rfqDate) : new Date();
    return this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { shopNumber: true },
      });
      if (!shop) {
        throw new BadRequestException('Invalid shopId');
      }

      const prefixSafeShop = shop.shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const rfqNumber = await this.numbers.nextNumber(tx, {
        shopId,
        docType: 'RFQ',
        prefix: `RFQ-${prefixSafeShop}`,
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
    return rfq;
  }

  async update(user: RequestUser, id: string, dto: UpdateRfqDto) {
    const existing = await this.get(user, id);
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

    if (!this.mail.isConfigured()) {
      throw new BadRequestException(
        'Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env, then restart the API.',
      );
    }

    const emailDelivery = await this.mail.sendRfqInvites({
      rfqId: existing.id,
      rfqNumber: existing.rfqNumber,
      rfqTitle: existing.title,
      deadline: existing.deadline,
      recipients: this.inviteRecipients(suppliers),
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

    const emailDelivery = await this.mail.sendRfqInvites({
      rfqId: existing.id,
      rfqNumber: existing.rfqNumber,
      rfqTitle: existing.title,
      deadline: existing.deadline,
      recipients: this.inviteRecipients(suppliers),
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
}


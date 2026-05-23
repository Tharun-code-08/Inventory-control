import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import {
  assertCompanyScope,
  assertSupplierInTenant,
  companyIdForUser,
  supplierListWhere,
} from '../../common/utils/shop-scope';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

const SUPPLIER_DELETE_TOKEN_TYP = 'supplier-delete-confirm';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async list(user: RequestUser, query: { search?: string; is_active?: boolean; cursor?: string; take?: number }) {
    const take = clampTake(query.take);
    const search = query.search?.trim();
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...supplierListWhere(user),
      ...(search
        ? {
            OR: [
              { supplierName: { contains: search, mode: 'insensitive' } },
              { supplierCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.is_active !== undefined ? { isActive: query.is_active } : {}),
    };

    const rows = await this.prisma.supplier.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        supplierCode: true,
        supplierName: true,
        companyId: true,
        taxId: true,
        vatNumber: true,
        rating: true,
        categories: true,
        contactPerson: true,
        email: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        paymentTerms: true,
        bankName: true,
        accountNumber: true,
        routingNumber: true,
        iban: true,
        isActive: true,
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async create(user: RequestUser, dto: CreateSupplierDto) {
    const companyId = companyIdForUser(user);
    if (!companyId) {
      throw new BadRequestException('Organisation context is required to create a supplier');
    }
    if (dto.companyId && dto.companyId !== companyId) {
      assertCompanyScope(user, dto.companyId);
    }
    const count = await this.prisma.supplier.count({ where: { companyId } });
    const code = dto.supplierCode?.trim() || `SUP-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.supplier.create({
      data: {
        supplierCode: code,
        supplierName: dto.supplierName,
        companyId,
        taxId: dto.taxId ?? null,
        vatNumber: dto.vatNumber ?? null,
        rating: dto.rating ?? 3,
        categories: Array.isArray(dto.categories) ? dto.categories : [],
        contactPerson: dto.contactPerson ?? null,
        email: dto.email?.toLowerCase?.() ?? null,
        phone: dto.phone ?? null,
        street: dto.street ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        postalCode: dto.postalCode ?? null,
        country: dto.country ?? null,
        paymentTerms: dto.paymentTerms ?? null,
        bankName: dto.bankName ?? null,
        accountNumber: dto.accountNumber ?? null,
        routingNumber: dto.routingNumber ?? null,
        iban: dto.iban ?? null,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
      include: { company: true },
    });
  }

  async get(user: RequestUser, id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id }, include: { company: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    assertSupplierInTenant(user, supplier.companyId);
    return supplier;
  }

  async update(user: RequestUser, id: string, dto: UpdateSupplierDto) {
    await this.get(user, id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        supplierCode: dto.supplierCode,
        supplierName: dto.supplierName,
        companyId: dto.companyId,
        taxId: dto.taxId,
        vatNumber: dto.vatNumber,
        rating: dto.rating,
        categories: dto.categories,
        contactPerson: dto.contactPerson,
        email: dto.email?.toLowerCase?.(),
        phone: dto.phone,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        paymentTerms: dto.paymentTerms,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        routingNumber: dto.routingNumber,
        iban: dto.iban,
        isActive: dto.isActive,
        updatedById: user.id,
      },
      include: { company: true },
    });
  }

  async getDeletionImpact(user: RequestUser, id: string) {
    const supplier = await this.get(user, id);
    if (supplier.deletedAt) {
      throw new BadRequestException('Supplier is already deleted');
    }

    const [rfqCount, quotationCount, contractCount, purchaseOrderCount, rfqLinks] =
      await Promise.all([
        this.prisma.rfqSupplier.count({ where: { supplierId: id } }),
        this.prisma.supplierQuotationHeader.count({ where: { supplierId: id } }),
        this.prisma.contractHeader.count({ where: { supplierId: id } }),
        this.prisma.purchaseOrderHeader.count({
          where: { supplier: supplier.supplierName },
        }),
        this.prisma.rfqSupplier.findMany({
          where: { supplierId: id },
          include: {
            rfq: { select: { id: true, rfqNumber: true, title: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      supplier: {
        id: supplier.id,
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
      },
      counts: {
        rfqInvitations: rfqCount,
        quotations: quotationCount,
        contracts: contractCount,
        purchaseOrders: purchaseOrderCount,
      },
      linkedRfqs: rfqLinks.map((link) => ({
        id: link.rfq.id,
        rfqNumber: link.rfq.rfqNumber,
        title: link.rfq.title,
        status: link.rfq.status,
      })),
      note:
        'Deleting removes the supplier from active lists. RFQs, POs, and other documents keep their historical supplier name.',
    };
  }

  private adminNotificationEmail(): string {
    const configured = this.config.get<string>('ADMIN_NOTIFICATION_EMAIL')?.trim();
    if (configured) return configured;
    return 'office@softdigitconsulting.com';
  }

  private createDeletionToken(supplierId: string, requestedBy: RequestUser): string {
    return this.jwt.sign(
      {
        typ: SUPPLIER_DELETE_TOKEN_TYP,
        sub: supplierId,
        requestedBy: requestedBy.id,
        requestedByName: requestedBy.email,
      },
      { expiresIn: '48h' },
    );
  }

  private verifyDeletionToken(token: string): { supplierId: string } {
    if (!token?.trim()) {
      throw new BadRequestException('Confirmation token is required');
    }
    try {
      const payload = this.jwt.verify(token) as {
        typ?: string;
        sub?: string;
      };
      if (payload.typ !== SUPPLIER_DELETE_TOKEN_TYP || !payload.sub) {
        throw new BadRequestException('Invalid confirmation token');
      }
      return { supplierId: payload.sub };
    } catch {
      throw new BadRequestException('Confirmation link is invalid or expired');
    }
  }

  async requestDeletion(user: RequestUser, id: string) {
    const impact = await this.getDeletionImpact(user, id);

    if (!this.mail.isConfigured()) {
      throw new BadRequestException(
        'Email is not configured. Cannot send deletion confirmation to admin.',
      );
    }

    const adminEmail = this.adminNotificationEmail();
    const token = this.createDeletionToken(id, user);

    await this.mail.sendSupplierDeletionConfirm({
      adminEmail,
      supplierName: impact.supplier.supplierName,
      supplierCode: impact.supplier.supplierCode,
      requestedByName: user.email,
      confirmToken: token,
      rfqCount: impact.counts.rfqInvitations,
      quotationCount: impact.counts.quotations,
      contractCount: impact.counts.contracts,
      purchaseOrderCount: impact.counts.purchaseOrders,
    });

    return {
      pending: true,
      adminEmail,
      impact,
      message: `Confirmation email sent to ${adminEmail}. The supplier is not deleted until the link is opened.`,
    };
  }

  async confirmDeletion(token: string) {
    const { supplierId } = this.verifyDeletionToken(token);
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    if (supplier.deletedAt) {
      return {
        success: true,
        alreadyDeleted: true,
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
        message: 'Supplier was already deleted.',
      };
    }

    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false, deletedAt: new Date() },
    });

    return {
      success: true,
      alreadyDeleted: false,
      supplierName: supplier.supplierName,
      supplierCode: supplier.supplierCode,
      message: 'Supplier deleted successfully.',
    };
  }

  /** @deprecated Use requestDeletion + email confirm */
  async remove(user: RequestUser, id: string) {
    return this.requestDeletion(user, id);
  }
}

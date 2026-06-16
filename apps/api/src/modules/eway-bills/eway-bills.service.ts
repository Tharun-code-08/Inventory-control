import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EwayBillStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import {
  CreateEwayBillDto,
  UpdateEwayBillDto,
  GenerateFromInvoiceDto,
  EwayBillFilterDto,
} from './dto/eway-bill.dto';

@Injectable()
export class EwayBillsService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: RequestUser): Prisma.EwayBillWhereInput {
    if (user.shopId) return { shopId: user.shopId };
    if (user.tenantShopIds.length) return { shopId: { in: user.tenantShopIds } };
    return { shopId: '00000000-0000-0000-0000-000000000000' };
  }

  async list(user: RequestUser, filter: EwayBillFilterDto) {
    return this.prisma.ewayBill.findMany({
      where: { ...this.scopeWhere(user), ...(filter.status ? { status: filter.status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { invoiceNumber: true } } },
    });
  }

  async get(user: RequestUser, id: string) {
    const bill = await this.prisma.ewayBill.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: { invoice: { select: { invoiceNumber: true } }, shop: { select: { shopName: true } } },
    });
    if (!bill) throw new NotFoundException('E-way bill not found');
    return bill;
  }

  async create(user: RequestUser, dto: CreateEwayBillDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);

    return this.prisma.ewayBill.create({
      data: {
        ewayBillNumber: this.draftNumber(),
        shopId,
        invoiceId: dto.invoiceId ?? null,
        status: EwayBillStatus.DRAFT,
        supplyType: dto.supplyType ?? 'OUTWARD',
        documentType: dto.documentType ?? 'TAX_INVOICE',
        documentNumber: dto.documentNumber,
        documentDate: new Date(dto.documentDate),
        fromGstin: dto.fromGstin ?? null,
        fromName: dto.fromName,
        fromAddress: dto.fromAddress ?? null,
        fromPlace: dto.fromPlace ?? null,
        fromPincode: dto.fromPincode ?? null,
        fromStateCode: dto.fromStateCode ?? null,
        toGstin: dto.toGstin ?? null,
        toName: dto.toName,
        toAddress: dto.toAddress ?? null,
        toPlace: dto.toPlace ?? null,
        toPincode: dto.toPincode ?? null,
        toStateCode: dto.toStateCode ?? null,
        transporterName: dto.transporterName ?? null,
        transporterId: dto.transporterId ?? null,
        transportMode: dto.transportMode ?? 'ROAD',
        vehicleNumber: dto.vehicleNumber ?? null,
        distanceKm: dto.distanceKm ?? null,
        transDocNumber: dto.transDocNumber ?? null,
        transDocDate: dto.transDocDate ? new Date(dto.transDocDate) : null,
        taxableValue: dto.taxableValue ?? 0,
        cgstValue: dto.cgstValue ?? 0,
        sgstValue: dto.sgstValue ?? 0,
        igstValue: dto.igstValue ?? 0,
        cessValue: dto.cessValue ?? 0,
        totalValue: dto.totalValue ?? 0,
        remarks: dto.remarks ?? null,
        createdById: user.id,
      },
    });
  }

  async createFromInvoice(user: RequestUser, dto: GenerateFromInvoiceDto) {
    const invoice = await this.prisma.invoiceHeader.findFirst({
      where: {
        id: dto.invoiceId,
        ...(user.shopId ? { shopId: user.shopId } : user.tenantShopIds.length ? { shopId: { in: user.tenantShopIds } } : {}),
      },
      include: {
        customer: true,
        shop: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    assertShopScope(user, invoice.shopId);

    const taxable = invoice.totalValue.minus(invoice.taxAmount);
    return this.prisma.ewayBill.create({
      data: {
        ewayBillNumber: this.draftNumber(),
        shopId: invoice.shopId,
        invoiceId: invoice.id,
        status: EwayBillStatus.DRAFT,
        supplyType: 'OUTWARD',
        documentType: 'TAX_INVOICE',
        documentNumber: invoice.invoiceNumber,
        documentDate: invoice.invoiceDate,
        fromName: invoice.shop.shopName,
        fromAddress: invoice.shop.address ?? null,
        toName: invoice.customer.customerName,
        toGstin: invoice.customer.taxId ?? null,
        toAddress:
          [invoice.customer.street, invoice.customer.city, invoice.customer.state]
            .filter(Boolean)
            .join(', ') || null,
        toPlace: invoice.customer.city ?? null,
        toPincode: invoice.customer.postalCode ?? null,
        toStateCode: invoice.customer.state ?? null,
        transportMode: dto.transportMode ?? 'ROAD',
        transporterName: dto.transporterName ?? null,
        vehicleNumber: dto.vehicleNumber ?? null,
        distanceKm: dto.distanceKm ?? null,
        taxableValue: taxable,
        igstValue: invoice.taxAmount,
        totalValue: invoice.totalValue,
        createdById: user.id,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateEwayBillDto) {
    const bill = await this.get(user, id);
    if (bill.status !== EwayBillStatus.DRAFT) {
      throw new BadRequestException('Only draft e-way bills can be edited');
    }
    return this.prisma.ewayBill.update({
      where: { id },
      data: {
        supplyType: dto.supplyType ?? undefined,
        documentType: dto.documentType ?? undefined,
        documentNumber: dto.documentNumber ?? undefined,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
        fromGstin: dto.fromGstin ?? undefined,
        fromName: dto.fromName ?? undefined,
        fromAddress: dto.fromAddress ?? undefined,
        fromPlace: dto.fromPlace ?? undefined,
        fromPincode: dto.fromPincode ?? undefined,
        fromStateCode: dto.fromStateCode ?? undefined,
        toGstin: dto.toGstin ?? undefined,
        toName: dto.toName ?? undefined,
        toAddress: dto.toAddress ?? undefined,
        toPlace: dto.toPlace ?? undefined,
        toPincode: dto.toPincode ?? undefined,
        toStateCode: dto.toStateCode ?? undefined,
        transporterName: dto.transporterName ?? undefined,
        transporterId: dto.transporterId ?? undefined,
        transportMode: dto.transportMode ?? undefined,
        vehicleNumber: dto.vehicleNumber ?? undefined,
        distanceKm: dto.distanceKm ?? undefined,
        transDocNumber: dto.transDocNumber ?? undefined,
        transDocDate: dto.transDocDate ? new Date(dto.transDocDate) : undefined,
        taxableValue: dto.taxableValue ?? undefined,
        cgstValue: dto.cgstValue ?? undefined,
        sgstValue: dto.sgstValue ?? undefined,
        igstValue: dto.igstValue ?? undefined,
        cessValue: dto.cessValue ?? undefined,
        totalValue: dto.totalValue ?? undefined,
        remarks: dto.remarks ?? undefined,
        updatedById: user.id,
      },
    });
  }

  async generate(user: RequestUser, id: string) {
    const bill = await this.get(user, id);
    if (bill.status !== EwayBillStatus.DRAFT) {
      throw new BadRequestException('E-way bill has already been generated');
    }
    if (!bill.vehicleNumber && bill.transportMode === 'ROAD') {
      throw new BadRequestException('A vehicle number is required for road transport');
    }
    return this.prisma.ewayBill.update({
      where: { id },
      data: {
        status: EwayBillStatus.GENERATED,
        ewayBillNumber: this.officialNumber(),
        generatedAt: new Date(),
        validUpto: this.validUpto(bill.distanceKm),
        updatedById: user.id,
      },
    });
  }

  async cancel(user: RequestUser, id: string, reason: string) {
    const bill = await this.get(user, id);
    if (bill.status === EwayBillStatus.CANCELLED) {
      throw new BadRequestException('E-way bill is already cancelled');
    }
    return this.prisma.ewayBill.update({
      where: { id },
      data: {
        status: EwayBillStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
        updatedById: user.id,
      },
    });
  }

  async stats(user: RequestUser) {
    const grouped = await this.prisma.ewayBill.groupBy({
      by: ['status'],
      where: this.scopeWhere(user),
      _count: { _all: true },
    });
    const out = { draft: 0, generated: 0, cancelled: 0, expired: 0 };
    for (const row of grouped) {
      if (row.status === 'DRAFT') out.draft = row._count._all;
      else if (row.status === 'GENERATED') out.generated = row._count._all;
      else if (row.status === 'CANCELLED') out.cancelled = row._count._all;
      else if (row.status === 'EXPIRED') out.expired = row._count._all;
    }
    return out;
  }

  /** A provisional 'DRFT-...' identifier before the bill is officially generated. */
  private draftNumber(): string {
    return `DRFT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
  }

  /** A 12-digit number mirroring the GST portal's EBN format (demo issuance). */
  private officialNumber(): string {
    let n = '';
    for (let i = 0; i < 12; i += 1) n += Math.floor(Math.random() * 10).toString();
    return n;
  }

  /** GST validity: 1 day per 200 km (min 1 day) from now. */
  private validUpto(distanceKm: number | null): Date {
    const days = Math.max(1, Math.ceil((distanceKm ?? 0) / 200));
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }
}

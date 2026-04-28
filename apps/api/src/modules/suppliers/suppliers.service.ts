import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { search?: string; is_active?: boolean }) {
    return this.prisma.supplier.findMany({
      where: {
        ...(query.search
          ? {
              OR: [
                { supplierName: { contains: query.search, mode: 'insensitive' } },
                { supplierCode: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.is_active !== undefined ? { isActive: query.is_active } : {}),
      },
      orderBy: { supplierCode: 'asc' },
      include: { company: true },
    });
  }

  async create(user: RequestUser, dto: CreateSupplierDto) {
    const count = await this.prisma.supplier.count();
    const code = dto.supplierCode?.trim() || `SUP-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.supplier.create({
      data: {
        supplierCode: code,
        supplierName: dto.supplierName,
        companyId: dto.companyId ?? null,
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

  async get(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id }, include: { company: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(user: RequestUser, id: string, dto: UpdateSupplierDto) {
    await this.get(id);
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

  async remove(user: RequestUser, id: string) {
    await this.get(id);
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false, updatedById: user.id },
    });
  }
}


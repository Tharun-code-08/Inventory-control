import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, search?: string) {
    const scopedShop = defaultShopFilter(user);
    return this.prisma.customer.findMany({
      where: {
        ...(scopedShop ? { shopId: scopedShop } : {}),
        ...(search
          ? {
              OR: [
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { customerCode: 'asc' },
      include: { shop: true },
    });
  }

  async create(user: RequestUser, dto: CreateCustomerDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    const count = await this.prisma.customer.count({ where: { shopId } });
    const customerCode = dto.customerCode?.trim() || `CUS-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.customer.create({
      data: {
        customerCode,
        customerName: dto.customerName,
        email: dto.email?.toLowerCase?.() ?? null,
        phone: dto.phone ?? null,
        taxId: dto.taxId ?? null,
        street: dto.street ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        postalCode: dto.postalCode ?? null,
        country: dto.country ?? null,
        shopId,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
      include: { shop: true },
    });
  }

  async get(user: RequestUser, id: string) {
    const item = await this.prisma.customer.findUnique({ where: { id }, include: { shop: true } });
    if (!item) throw new NotFoundException('Customer not found');
    assertShopScope(user, item.shopId);
    return item;
  }

  async update(user: RequestUser, id: string, dto: UpdateCustomerDto) {
    const existing = await this.get(user, id);
    if (dto.shopId) assertShopScope(user, dto.shopId);
    return this.prisma.customer.update({
      where: { id },
      data: {
        customerName: dto.customerName,
        email: dto.email?.toLowerCase?.(),
        phone: dto.phone,
        taxId: dto.taxId,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        shopId: dto.shopId ?? existing.shopId,
        isActive: dto.isActive,
        updatedById: user.id,
      },
      include: { shop: true },
    });
  }
}


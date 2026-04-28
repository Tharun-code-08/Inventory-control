import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, query: { is_active?: boolean; cursor?: string; take?: number }) {
    const take = clampTake(query.take);
    const shopScope = defaultShopFilter(user);
    const where: Prisma.ShopWhereInput = {};
    if (shopScope) where.id = shopScope;
    if (query.is_active !== undefined) where.isActive = query.is_active;

    const rows = await this.prisma.shop.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      include: { company: true },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async create(user: RequestUser, dto: CreateShopDto) {
    return this.prisma.shop.create({
      data: {
        shopNumber: dto.shopNumber,
        shopName: dto.shopName,
        taxId: dto.taxId ?? null,
        address: dto.address,
        contactPerson: dto.contactPerson,
        mobile: dto.mobile,
        email: dto.email.toLowerCase().trim(),
        companyId: dto.companyId,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
      include: { company: true },
    });
  }

  async get(user: RequestUser, id: string) {
    assertShopScope(user, id);
    const shop = await this.prisma.shop.findUnique({ where: { id }, include: { company: true } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(user: RequestUser, id: string, dto: UpdateShopDto) {
    assertShopScope(user, id);
    await this.get(user, id);
    return this.prisma.shop.update({
      where: { id },
      data: {
        shopNumber: dto.shopNumber,
        shopName: dto.shopName,
        taxId: dto.taxId,
        address: dto.address,
        contactPerson: dto.contactPerson,
        mobile: dto.mobile,
        email: dto.email?.toLowerCase().trim(),
        companyId: dto.companyId,
        isActive: dto.isActive,
        updatedById: user.id,
      },
      include: { company: true },
    });
  }

  async softDelete(user: RequestUser, id: string) {
    assertShopScope(user, id);
    const posted = await this.prisma.goodsReceiptHeader.count({
      where: { shopId: id, status: DocumentStatus.POSTED },
    });
    const postedGi = await this.prisma.goodsIssueHeader.count({
      where: { shopId: id, status: DocumentStatus.POSTED },
    });
    const postedDm = await this.prisma.damagedStock.count({
      where: { shopId: id, status: DocumentStatus.POSTED },
    });
    const postedPo = await this.prisma.purchaseOrderHeader.count({
      where: { shopId: id, status: PurchaseOrderStatus.CONFIRMED },
    });
    if (posted + postedGi + postedDm + postedPo > 0) {
      throw new BadRequestException('Cannot deactivate shop with posted transactions');
    }
    return this.prisma.shop.update({
      where: { id },
      data: { isActive: false, updatedById: user.id },
    });
  }
}

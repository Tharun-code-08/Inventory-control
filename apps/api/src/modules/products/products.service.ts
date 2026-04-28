import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { StockService } from '../stock/stock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(
    user: RequestUser,
    query: {
      shop_id?: string;
      category?: string;
      is_active?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const limit = clampTake(query.limit);
    const page = query.page && query.page > 0 ? query.page : 1;
    const skip = (page - 1) * limit;
    const shopScope = defaultShopFilter(user);
    const shopId = shopScope ?? query.shop_id;
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.ProductWhereInput = {
      ...(shopId ? { shopId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.is_active !== undefined ? { isActive: query.is_active } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { productCode: { contains: query.search.trim(), mode: 'insensitive' } },
              { description: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { shop: true, stockSummaries: { select: { currentStock: true }, take: 1 } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((product) => {
        const { stockSummaries, ...rest } = product;
        return {
          ...rest,
          currentStock:
            stockSummaries[0] != null ? Number(stockSummaries[0].currentStock) : undefined,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(user: RequestUser, dto: CreateProductDto) {
    assertShopScope(user, dto.shopId);
    if (dto.sellingPrice < dto.purchasePrice) {
      // warn only at API layer: include message in response via interceptor? Return header - spec says warn not block
    }
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          productCode: dto.productCode,
          description: dto.description,
          uom: dto.uom,
          shopId: dto.shopId,
          category: dto.category,
          purchasePrice: new Prisma.Decimal(dto.purchasePrice),
          sellingPrice: new Prisma.Decimal(dto.sellingPrice),
          minStockLevel: new Prisma.Decimal(dto.minStockLevel),
          openingStock: new Prisma.Decimal(dto.openingStock),
          reorderQty: dto.reorderQty !== undefined ? new Prisma.Decimal(dto.reorderQty) : null,
          isActive: dto.isActive ?? true,
          createdById: user.id,
        },
      });

      if (Number(dto.openingStock) > 0) {
        await this.stock.postMovement(tx, {
          type: TransactionType.OPENING,
          ref: `OPENING-${product.productCode}`,
          date: new Date(),
          shopId: product.shopId,
          productId: product.id,
          inQty: Number(dto.openingStock),
          outQty: 0,
          unitRate: undefined,
          remarks: 'Opening stock',
          userId: user.id,
        });
      }

      return product;
    });
  }

  async get(user: RequestUser, id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { shop: true } });
    if (!product) throw new NotFoundException('Product not found');
    assertShopScope(user, product.shopId);
    return product;
  }

  async update(user: RequestUser, id: string, dto: UpdateProductDto) {
    const existing = await this.get(user, id);
    if (dto.shopId) assertShopScope(user, dto.shopId);
    assertShopScope(user, existing.shopId);
    return this.prisma.product.update({
      where: { id },
      data: {
        productCode: dto.productCode,
        description: dto.description,
        uom: dto.uom,
        shopId: dto.shopId,
        category: dto.category,
        purchasePrice: dto.purchasePrice !== undefined ? new Prisma.Decimal(dto.purchasePrice) : undefined,
        sellingPrice: dto.sellingPrice !== undefined ? new Prisma.Decimal(dto.sellingPrice) : undefined,
        minStockLevel: dto.minStockLevel !== undefined ? new Prisma.Decimal(dto.minStockLevel) : undefined,
        openingStock: dto.openingStock !== undefined ? new Prisma.Decimal(dto.openingStock) : undefined,
        reorderQty: dto.reorderQty !== undefined ? new Prisma.Decimal(dto.reorderQty) : undefined,
        isActive: dto.isActive,
        updatedById: user.id,
      },
    });
  }

  async remove(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    const relatedUsage = await this.prisma.$transaction([
      this.prisma.goodsReceiptItem.count({ where: { productId: id } }),
      this.prisma.goodsIssueItem.count({ where: { productId: id } }),
      this.prisma.purchaseOrderItem.count({ where: { productId: id } }),
      this.prisma.damagedStock.count({ where: { productId: id } }),
      this.prisma.stockLedger.count({ where: { productId: id } }),
      this.prisma.stockSummary.count({ where: { productId: id } }),
    ]);

    const hasRelatedRecords = relatedUsage.some((count) => count > 0);
    if (hasRelatedRecords) {
      throw new BadRequestException('Cannot delete a product with existing stock or transaction history');
    }

    await this.prisma.$transaction([
      this.prisma.product.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.DELETE,
          entityType: 'product',
          entityId: existing.id,
          oldValues: {
            productCode: existing.productCode,
            description: existing.description,
          },
        },
      }),
    ]);

    return { ok: true };
  }

  async stockHistory(user: RequestUser, productId: string, query: { cursor?: string; take?: number }) {
    await this.get(user, productId);
    const take = clampTake(query.take);
    const rows = await this.prisma.stockLedger.findMany({
      where: { productId },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }
}

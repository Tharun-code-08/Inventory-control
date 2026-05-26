import { Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async inventory(user: RequestUser, query: { shop_id?: string }) {
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const shopWhere = shopListWhere(user);
    const grItems = await this.prisma.goodsReceiptItem.findMany({
      where: {
        expiryDate: { not: null },
        header: {
          status: DocumentStatus.POSTED,
          shop: shopWhere,
          ...(query.shop_id ? { shopId: query.shop_id } : {}),
        },
      },
      orderBy: { header: { postedAt: 'desc' } },
      select: {
        productId: true,
        expiryDate: true,
        batchNumber: true,
        storageLocationId: true,
        header: { select: { shopId: true, postedAt: true } },
      },
    });

    const expiryByKey = new Map<
      string,
      { expiryDate: string; batchNumber: string | null; storageLocationId: string | null; shopId: string }
    >();
    for (const line of grItems) {
      const shopId = line.header.shopId;
      const locationKey = line.storageLocationId ?? 'default';
      const key = `${line.productId}:${shopId}:${locationKey}`;
      if (!expiryByKey.has(key)) {
        expiryByKey.set(key, {
          shopId,
          expiryDate: line.expiryDate!.toISOString().slice(0, 10),
          batchNumber: line.batchNumber,
          storageLocationId: line.storageLocationId,
        });
      }
    }

    return {
      data: Array.from(expiryByKey.entries()).map(([key, value]) => ({
        key,
        productId: key.split(':')[0],
        shopId: value.shopId,
        storageLocationId: value.storageLocationId,
        expiryDate: value.expiryDate,
        batchNumber: value.batchNumber,
      })),
    };
  }
}

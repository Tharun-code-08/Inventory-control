import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { shopListWhere } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { SubscriptionService } from '../billing/subscription.service';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  /** Attach orphaned plants (missing company) to the creator's organisation. */
  private async repairOrphanShops(user: RequestUser) {
    if (!user.companyId) return;
    await this.prisma.shop.updateMany({
      where: {
        companyId: null,
        OR: [
          { createdById: user.id },
          { createdBy: { shop: { companyId: user.companyId } } },
        ],
      },
      data: { companyId: user.companyId },
    });
  }

  private async assertPlantAccess(user: RequestUser, shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, companyId: true, createdById: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    if (user.companyId && shop.companyId === user.companyId) return;
    if (!shop.companyId && shop.createdById === user.id) return;
    if (!shop.companyId && shop.createdById && user.companyId) {
      const creator = await this.prisma.user.findUnique({
        where: { id: shop.createdById },
        select: { shop: { select: { companyId: true } } },
      });
      if (creator?.shop?.companyId === user.companyId) return;
    }

    const allowed = shopListWhere(user);
    const visible = await this.prisma.shop.findFirst({
      where: { id: shopId, ...allowed },
      select: { id: true },
    });
    if (!visible) {
      throw new NotFoundException('Shop not found');
    }
  }

  private async purgeUnusedStorageLocations(shopId: string) {
    const locations = await this.prisma.storageLocation.findMany({
      where: { shopId },
      select: { id: true },
    });
    for (const location of locations) {
      const [productPlants, receiptItems, transfersFrom, transfersTo] = await Promise.all([
        this.prisma.productPlant.count({ where: { storageLocationId: location.id } }),
        this.prisma.goodsReceiptItem.count({ where: { storageLocationId: location.id } }),
        this.prisma.stockTransferHeader.count({ where: { fromLocationId: location.id } }),
        this.prisma.stockTransferHeader.count({ where: { toLocationId: location.id } }),
      ]);
      if (productPlants + receiptItems + transfersFrom + transfersTo === 0) {
        await this.prisma.storageLocation.delete({ where: { id: location.id } });
      }
    }
  }

  async list(user: RequestUser, query: { is_active?: boolean; cursor?: string; take?: number }) {
    await this.repairOrphanShops(user);
    const take = clampTake(query.take);
    const where: Prisma.ShopWhereInput = {
      ...shopListWhere(user),
    };
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
    const companyId = dto.companyId ?? user.companyId ?? undefined;
    if (companyId) {
      await this.subscriptions.assertWarehouseLimit(companyId);
    }
    return this.prisma.shop.create({
      data: {
        shopNumber: dto.shopNumber,
        shopName: dto.shopName,
        taxId: dto.taxId ?? null,
        address: dto.address,
        contactPerson: dto.contactPerson,
        mobile: dto.mobile,
        email: dto.email.toLowerCase().trim(),
        companyId,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
      include: { company: true },
    });
  }

  async get(user: RequestUser, id: string) {
    await this.assertPlantAccess(user, id);
    const shop = await this.prisma.shop.findUnique({ where: { id }, include: { company: true } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(user: RequestUser, id: string, dto: UpdateShopDto) {
    await this.assertPlantAccess(user, id);
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

  /**
   * Hard-delete a plant. Refuses if the plant has any dependents
   * (product assignments, users, storage locations, transactions, ledgers,
   * cost layers). The recommended path for a "used" plant is the
   * isActive toggle exposed via PATCH — this method exists for true cleanup
   * of mistyped or never-used plants only.
   */
  async remove(user: RequestUser, id: string) {
    await this.assertPlantAccess(user, id);
    await this.get(user, id);

    const countBlockers = async () => {
      const [
        productPlantCount,
        storageLocCount,
        userCount,
        grCount,
        giCount,
        dmgCount,
        poCount,
        ledgerCount,
        summaryCount,
        costLayerCount,
      ] = await Promise.all([
        this.prisma.productPlant.count({ where: { shopId: id } }),
        this.prisma.storageLocation.count({ where: { shopId: id } }),
        this.prisma.user.count({ where: { shopId: id } }),
        this.prisma.goodsReceiptHeader.count({ where: { shopId: id } }),
        this.prisma.goodsIssueHeader.count({ where: { shopId: id } }),
        this.prisma.damagedStock.count({ where: { shopId: id } }),
        this.prisma.purchaseOrderHeader.count({ where: { shopId: id } }),
        this.prisma.stockLedger.count({ where: { shopId: id } }),
        this.prisma.stockSummary.count({ where: { shopId: id } }),
        this.prisma.costLayer.count({ where: { shopId: id } }),
      ]);

      const blockers: string[] = [];
      if (productPlantCount > 0) blockers.push('product assignments');
      if (storageLocCount > 0) blockers.push('storage locations');
      if (userCount > 0) blockers.push('users');
      if (grCount + giCount + dmgCount + poCount > 0) blockers.push('transactions');
      if (ledgerCount + summaryCount + costLayerCount > 0) blockers.push('stock history');
      return blockers;
    };

    let blockers = await countBlockers();
    if (blockers.length === 1 && blockers[0] === 'storage locations') {
      await this.purgeUnusedStorageLocations(id);
      blockers = await countBlockers();
    }

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Cannot delete this plant — it still has ${blockers.join(', ')}. ` +
          'Deactivate the plant instead to keep its history intact.',
      );
    }

    try {
      await this.prisma.shop.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      // Catch any unforeseen FK reference (e.g. RFQ, contracts, quotations)
      // and translate it into a friendly "deactivate instead" message rather
      // than leaking a Prisma error to the client.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete this plant — it is still referenced by other records. ' +
            'Deactivate the plant instead.',
        );
      }
      throw err;
    }
  }
}

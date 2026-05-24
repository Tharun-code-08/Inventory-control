import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, PurchaseOrderStatus, TaxPreference, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, requireCompanyId, shopIdsForUser } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { StockService } from '../stock/stock.service';
import { SubscriptionService } from '../billing/subscription.service';
import { BulkInventoryDto, BulkInventoryRowDto } from './dto/bulk-inventory.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductPlantDto } from './dto/product-plant.dto';
import { ProductSpecificationDto } from './dto/product-specification.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_INCLUDE = {
  plants: {
    include: { storageLocation: { select: { id: true, code: true, name: true } } },
    orderBy: [{ shopId: 'asc' }],
  },
  specifications: { orderBy: [{ sortOrder: 'asc' }] },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  /**
   * Validate every plant assignment in the payload against the requesting
   * user's scope and the storage-location -> shop relationship. Throws on the
   * first violation so the caller can surface the message verbatim.
   */
  private async validateAssignments(
    user: RequestUser,
    plants: ProductPlantDto[],
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (plants.length === 0) {
      throw new BadRequestException('At least one plant assignment is required');
    }
    const seenShops = new Set<string>();
    for (const plant of plants) {
      if (seenShops.has(plant.shopId)) {
        throw new BadRequestException('Duplicate plant assignment');
      }
      seenShops.add(plant.shopId);
      assertShopScope(user, plant.shopId);
      if (
        plant.maxStockLevel !== undefined &&
        Number(plant.maxStockLevel) < Number(plant.minStockLevel ?? 0)
      ) {
        throw new BadRequestException('Max stock level must be greater than or equal to min stock level');
      }
      if (plant.storageLocationId) {
        const location = await tx.storageLocation.findUnique({
          where: { id: plant.storageLocationId },
        });
        if (!location || location.shopId !== plant.shopId) {
          throw new BadRequestException('Invalid storage location for selected plant');
        }
      }
    }
  }

  /** Decode the per-plant decimals returned by Prisma into plain numbers. */
  private decoratePlant<T extends { openingStock: Prisma.Decimal; minStockLevel: Prisma.Decimal; maxStockLevel: Prisma.Decimal | null; reorderQty: Prisma.Decimal | null }>(plant: T) {
    return {
      ...plant,
      openingStock: Number(plant.openingStock),
      minStockLevel: Number(plant.minStockLevel),
      maxStockLevel: plant.maxStockLevel == null ? null : Number(plant.maxStockLevel),
      reorderQty: plant.reorderQty == null ? null : Number(plant.reorderQty),
    };
  }

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
    const companyId = requireCompanyId(user);
    const shopId = query.shop_id;
    if (query.shop_id) assertShopScope(user, query.shop_id);
    const tenantShopIds = shopIdsForUser(user);
    const plantScope =
      shopId != null
        ? { shopId }
        : tenantShopIds && tenantShopIds.length > 0
          ? { shopId: { in: tenantShopIds } }
          : { shop: { companyId } };

    const where: Prisma.ProductWhereInput = {
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
      ...(plantScope ? { plants: { some: plantScope } } : {}),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Stock summaries are keyed by (shopId, productId); fetch them in one
    // round-trip so the list view can render per-plant currentStock without
    // an N+1.
    const productIds = products.map((p) => p.id);
    const summaries = productIds.length
      ? await this.prisma.stockSummary.findMany({
          where: {
            productId: { in: productIds },
            ...(shopId
              ? { shopId }
              : tenantShopIds && tenantShopIds.length > 0
                ? { shopId: { in: tenantShopIds } }
                : { shop: { companyId } }),
          },
          select: { productId: true, shopId: true, currentStock: true },
        })
      : [];
    const stockByProduct = new Map<string, Record<string, number>>();
    for (const summary of summaries) {
      const map = stockByProduct.get(summary.productId) ?? {};
      map[summary.shopId] = Number(summary.currentStock);
      stockByProduct.set(summary.productId, map);
    }

    return {
      data: products.map((product) => {
        const stockByShop = stockByProduct.get(product.id) ?? {};
        const totalStock = Object.values(stockByShop).reduce((acc, n) => acc + n, 0);
        return {
          ...product,
          purchasePrice: Number(product.purchasePrice),
          sellingPrice: Number(product.sellingPrice),
          plants: product.plants.map((plant) => this.decoratePlant(plant)),
          stockByShop,
          totalStock,
          // currentStock collapses to "the filtered shop's stock" when a
          // shop filter is active, otherwise the sum across all plants.
          currentStock: shopId ? stockByShop[shopId] ?? 0 : totalStock,
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
    if (Number(dto.sellingPrice) < Number(dto.purchasePrice)) {
      // Spec: warn, don't block. Surfaced via response interceptor in the
      // future; today we silently accept.
    }
    await this.validateAssignments(user, dto.plants);
    const companyId = requireCompanyId(user);
    if (companyId) {
      await this.subscriptions.assertSkuLimit(companyId);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          productCode: dto.productCode,
          description: dto.description,
          uom: dto.uom,
          category: dto.category,
          hsnCode: dto.hsnCode ?? null,
          materialGroup: dto.materialGroup ?? null,
          drawingReference: dto.drawingReference ?? null,
          brand: dto.brand ?? null,
          taxPreference: dto.taxPreference ?? TaxPreference.TAXABLE,
          purchasePrice: new Prisma.Decimal(dto.purchasePrice),
          sellingPrice: new Prisma.Decimal(dto.sellingPrice),
          isActive: dto.isActive ?? true,
          createdById: user.id,
          plants: {
            create: dto.plants.map((plant) => ({
              shopId: plant.shopId,
              storageLocationId: plant.storageLocationId ?? null,
              openingStock: new Prisma.Decimal(plant.openingStock ?? 0),
              minStockLevel: new Prisma.Decimal(plant.minStockLevel ?? 0),
              maxStockLevel:
                plant.maxStockLevel === undefined ? null : new Prisma.Decimal(plant.maxStockLevel),
              reorderQty:
                plant.reorderQty === undefined ? null : new Prisma.Decimal(plant.reorderQty),
              isActive: plant.isActive ?? true,
              createdById: user.id,
            })),
          },
          specifications: dto.specifications?.length
            ? {
                create: dto.specifications.map((spec, index) => ({
                  label: spec.label,
                  value: spec.value,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: PRODUCT_INCLUDE,
      });

      for (const plant of dto.plants) {
        if (Number(plant.openingStock ?? 0) > 0) {
          await this.stock.postMovement(tx, {
            type: TransactionType.OPENING,
            ref: `OPENING-${product.productCode}-${plant.shopId.slice(0, 8)}`,
            date: new Date(),
            shopId: plant.shopId,
            productId: product.id,
            inQty: Number(plant.openingStock),
            outQty: 0,
            remarks: 'Opening stock',
            userId: user.id,
          });
        }
      }

      return {
        ...product,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        plants: product.plants.map((plant) => this.decoratePlant(plant)),
      };
    });
  }

  /**
   * Suggest PO line values for a low-stock product: qty from plant thresholds,
   * supplier/rate from the most recent non-cancelled PO for the same shop.
   */
  async reorderSuggestion(user: RequestUser, id: string, shop_id?: string) {
    const product = await this.get(user, id);
    const shopId = shop_id ?? user.shopId;
    if (!shopId) {
      throw new BadRequestException('shop_id is required when ordering for a product');
    }
    assertShopScope(user, shopId);

    const plant = product.plants.find((p) => p.shopId === shopId && p.isActive);
    if (!plant) {
      throw new BadRequestException('Product is not assigned to the selected plant');
    }

    const summary = await this.prisma.stockSummary.findUnique({
      where: { shopId_productId: { shopId, productId: id } },
      select: { currentStock: true },
    });
    const currentStock = Number(summary?.currentStock ?? 0);
    const minStockLevel = plant.minStockLevel;
    const gap = Math.max(0, minStockLevel - currentStock);
    const reorderQty = plant.reorderQty != null && plant.reorderQty > 0 ? plant.reorderQty : gap;
    const orderQty = Math.max(gap, reorderQty, 1);

    const lastLine = await this.prisma.purchaseOrderItem.findFirst({
      where: {
        productId: id,
        header: {
          shopId,
          status: { not: PurchaseOrderStatus.CANCELLED },
        },
      },
      orderBy: { header: { createdAt: 'desc' } },
      include: {
        header: { select: { supplier: true, poNumber: true, poDate: true } },
      },
    });

    const supplier = lastLine?.header.supplier?.trim() ?? null;
    const rate = lastLine ? Number(lastLine.rate) : product.purchasePrice;

    return {
      productId: id,
      shopId,
      productCode: product.productCode,
      description: product.description,
      supplier,
      rate,
      orderQty,
      currentStock,
      minStockLevel,
      suggestedQty: gap,
      hasPriorOrder: !!lastLine,
      lastPoNumber: lastLine?.header.poNumber ?? null,
    };
  }

  async get(user: RequestUser, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    const tenantShopIds = shopIdsForUser(user);
    if (tenantShopIds) {
      const accessible = product.plants.some((plant) => tenantShopIds.includes(plant.shopId));
      if (!accessible) throw new NotFoundException('Product not found');
    }
    return {
      ...product,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      plants: product.plants.map((plant) => this.decoratePlant(plant)),
    };
  }

  async update(user: RequestUser, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { plants: true, specifications: true },
    });
    if (!existing) throw new NotFoundException('Product not found');

    if (dto.plants) {
      await this.validateAssignments(user, dto.plants);
    } else {
      const tenantShopIds = shopIdsForUser(user);
      if (tenantShopIds) {
        const accessible = existing.plants.some((plant) => tenantShopIds.includes(plant.shopId));
        if (!accessible) throw new NotFoundException('Product not found');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          productCode: dto.productCode,
          description: dto.description,
          uom: dto.uom,
          category: dto.category,
          hsnCode: dto.hsnCode === undefined ? undefined : dto.hsnCode ?? null,
          materialGroup: dto.materialGroup ?? undefined,
          drawingReference: dto.drawingReference ?? undefined,
          brand: dto.brand === undefined ? undefined : dto.brand ?? null,
          taxPreference: dto.taxPreference ?? undefined,
          purchasePrice:
            dto.purchasePrice !== undefined ? new Prisma.Decimal(dto.purchasePrice) : undefined,
          sellingPrice:
            dto.sellingPrice !== undefined ? new Prisma.Decimal(dto.sellingPrice) : undefined,
          isActive: dto.isActive,
          updatedById: user.id,
        },
      });

      // Specifications: replace wholesale. Cheap because the row count is
      // small and the UI always sends the full ordered list.
      if (dto.specifications !== undefined) {
        await tx.productSpecification.deleteMany({ where: { productId: id } });
        if (dto.specifications.length > 0) {
          await tx.productSpecification.createMany({
            data: dto.specifications.map((spec, index) => ({
              productId: id,
              label: spec.label,
              value: spec.value,
              sortOrder: index,
            })),
          });
        }
      }

      // Plant assignments: diff by shopId, then add new, update existing,
      // remove dropped. New assignments with openingStock > 0 emit an
      // OPENING ledger entry. Existing assignments never re-post opening
      // stock to avoid double-counting on form re-submits.
      if (dto.plants) {
        const existingByShop = new Map(existing.plants.map((plant) => [plant.shopId, plant]));
        const incomingByShop = new Map(dto.plants.map((plant) => [plant.shopId, plant]));

        const newAssignments: ProductPlantDto[] = [];

        for (const incoming of dto.plants) {
          const prior = existingByShop.get(incoming.shopId);
          if (prior) {
            await tx.productPlant.update({
              where: { id: prior.id },
              data: {
                storageLocationId: incoming.storageLocationId ?? null,
                minStockLevel: new Prisma.Decimal(incoming.minStockLevel ?? 0),
                maxStockLevel:
                  incoming.maxStockLevel === undefined
                    ? null
                    : new Prisma.Decimal(incoming.maxStockLevel),
                reorderQty:
                  incoming.reorderQty === undefined
                    ? null
                    : new Prisma.Decimal(incoming.reorderQty),
                isActive: incoming.isActive ?? prior.isActive,
                updatedById: user.id,
              },
            });
          } else {
            await tx.productPlant.create({
              data: {
                productId: id,
                shopId: incoming.shopId,
                storageLocationId: incoming.storageLocationId ?? null,
                openingStock: new Prisma.Decimal(incoming.openingStock ?? 0),
                minStockLevel: new Prisma.Decimal(incoming.minStockLevel ?? 0),
                maxStockLevel:
                  incoming.maxStockLevel === undefined
                    ? null
                    : new Prisma.Decimal(incoming.maxStockLevel),
                reorderQty:
                  incoming.reorderQty === undefined
                    ? null
                    : new Prisma.Decimal(incoming.reorderQty),
                isActive: incoming.isActive ?? true,
                createdById: user.id,
              },
            });
            newAssignments.push(incoming);
          }
        }

        for (const prior of existing.plants) {
          if (!incomingByShop.has(prior.shopId)) {
            // Two-tier removal: hard-delete the plant when there is no
            // transaction history against (productId, shopId), otherwise
            // soft-deactivate so historical rows still resolve their plant
            // context without a missing FK. The user-facing "Delete" action
            // therefore feels like a real delete when it's safe to do, and
            // gracefully degrades to "Deactivate" otherwise.
            const [grCount, giCount, poCount, dmgCount, ledgerCount, summaryRow] =
              await Promise.all([
                tx.goodsReceiptItem.count({
                  where: { productId: id, header: { shopId: prior.shopId } },
                }),
                tx.goodsIssueItem.count({
                  where: { productId: id, header: { shopId: prior.shopId } },
                }),
                tx.purchaseOrderItem.count({
                  where: { productId: id, header: { shopId: prior.shopId } },
                }),
                tx.damagedStock.count({
                  where: { productId: id, shopId: prior.shopId },
                }),
                tx.stockLedger.count({
                  where: { productId: id, shopId: prior.shopId },
                }),
                tx.stockSummary.findUnique({
                  where: { shopId_productId: { shopId: prior.shopId, productId: id } },
                  select: { currentStock: true },
                }),
              ]);
            const hasHistory =
              grCount + giCount + poCount + dmgCount + ledgerCount > 0 ||
              (summaryRow && Number(summaryRow.currentStock) !== 0);

            if (hasHistory) {
              await tx.productPlant.update({
                where: { id: prior.id },
                data: { isActive: false, updatedById: user.id },
              });
            } else {
              await tx.productPlant.delete({ where: { id: prior.id } });
            }
          }
        }

        for (const incoming of newAssignments) {
          if (Number(incoming.openingStock ?? 0) > 0) {
            await this.stock.postMovement(tx, {
              type: TransactionType.OPENING,
              ref: `OPENING-${updated.productCode}-${incoming.shopId.slice(0, 8)}`,
              date: new Date(),
              shopId: incoming.shopId,
              productId: id,
              inQty: Number(incoming.openingStock),
              outQty: 0,
              remarks: 'Opening stock',
              userId: user.id,
            });
          }
        }
      }

      const refreshed = await tx.product.findUniqueOrThrow({
        where: { id },
        include: PRODUCT_INCLUDE,
      });
      return {
        ...refreshed,
        purchasePrice: Number(refreshed.purchasePrice),
        sellingPrice: Number(refreshed.sellingPrice),
        plants: refreshed.plants.map((plant) => this.decoratePlant(plant)),
      };
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

  /**
   * Bulk update plant-level inventory thresholds from a CSV upload. Keyed by
   * (productCode, shopNumber, optional storageLocationCode). Only writes
   * minStockLevel, maxStockLevel, reorderQty, and storageLocationId — never
   * posts stock-ledger movements, so opening balances stay intact.
   */
  async bulkUpdateInventory(user: RequestUser, dto: BulkInventoryDto) {
    const errors: Array<{ row: number; message: string }> = [];
    let updated = 0;

    // Resolve master lookups in batches so we do at most a constant number of
    // queries regardless of row count.
    const codes = [...new Set(dto.rows.map((row) => row.productCode.toUpperCase()))];
    const shopNumbers = [...new Set(dto.rows.map((row) => row.shopNumber))];
    const [products, shops] = await Promise.all([
      this.prisma.product.findMany({
        where: { productCode: { in: codes } },
        select: { id: true, productCode: true },
      }),
      this.prisma.shop.findMany({
        where: { shopNumber: { in: shopNumbers } },
        select: { id: true, shopNumber: true },
      }),
    ]);
    const productByCode = new Map(products.map((p) => [p.productCode, p.id]));
    const shopByNumber = new Map(shops.map((s) => [s.shopNumber, s.id]));

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.rows.length; i += 1) {
        const row = dto.rows[i];
        const rowNumber = i + 2; // header is row 1 in the source CSV
        try {
          await this.applyBulkInventoryRow(tx, user, row, productByCode, shopByNumber);
          updated += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ row: rowNumber, message });
        }
      }
    });

    return { updated, errors, total: dto.rows.length };
  }

  private async applyBulkInventoryRow(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    row: BulkInventoryRowDto,
    productByCode: Map<string, string>,
    shopByNumber: Map<string, string>,
  ) {
    const productId = productByCode.get(row.productCode.toUpperCase());
    if (!productId) {
      throw new Error(`Product not found: ${row.productCode}`);
    }
    const shopId = shopByNumber.get(row.shopNumber);
    if (!shopId) {
      throw new Error(`Plant not found: ${row.shopNumber}`);
    }
    assertShopScope(user, shopId);

    let storageLocationId: string | undefined;
    if (row.storageLocationCode) {
      const location = await tx.storageLocation.findFirst({
        where: { shopId, code: row.storageLocationCode },
        select: { id: true },
      });
      if (!location) {
        throw new Error(`Storage location not found for plant ${row.shopNumber}: ${row.storageLocationCode}`);
      }
      storageLocationId = location.id;
    }

    const plant = await tx.productPlant.findFirst({
      where: { productId, shopId },
      select: { id: true, minStockLevel: true, maxStockLevel: true },
    });
    if (!plant) {
      throw new Error(`Product ${row.productCode} is not assigned to plant ${row.shopNumber}`);
    }

    const nextMin = row.minStock !== undefined ? row.minStock : Number(plant.minStockLevel);
    const nextMax =
      row.maxStock !== undefined
        ? row.maxStock
        : plant.maxStockLevel == null
          ? null
          : Number(plant.maxStockLevel);
    if (nextMax !== null && nextMax < nextMin) {
      throw new Error('Max stock level must be greater than or equal to min stock level');
    }

    await tx.productPlant.update({
      where: { id: plant.id },
      data: {
        ...(row.minStock !== undefined ? { minStockLevel: new Prisma.Decimal(row.minStock) } : {}),
        ...(row.maxStock !== undefined ? { maxStockLevel: new Prisma.Decimal(row.maxStock) } : {}),
        ...(row.reorderQty !== undefined ? { reorderQty: new Prisma.Decimal(row.reorderQty) } : {}),
        ...(storageLocationId ? { storageLocationId } : {}),
        updatedById: user.id,
      },
    });
  }

  async stockHistory(user: RequestUser, productId: string, query: { cursor?: string; take?: number }) {
    await this.get(user, productId);
    const take = clampTake(query.take);
    const rows = await this.prisma.stockLedger.findMany({
      where: {
        productId,
        ...(user.shopId ? { shopId: user.shopId } : {}),
      },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }
}

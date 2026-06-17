import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, TaxPreference, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, requireCompanyId, shopIdsForUser } from '../../common/utils/shop-scope';
import { verifyShopInTenant } from '../../common/utils/shop-access';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { StockService } from '../stock/stock.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { DocumentSeriesService } from '../document-series/document-series.service';
import { SubscriptionService } from '../billing/subscription.service';
import { AuditService } from '../audit/audit.service';
import { BulkInventoryDto, BulkInventoryRowDto } from './dto/bulk-inventory.dto';
import { BulkProductUpsertDto, BulkProductUpsertRowDto } from './dto/bulk-product-upsert.dto';
import { ProductImageStorageService } from '../../common/upload/product-image-storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductPlantDto } from './dto/product-plant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  buildCreateProductAudit,
  buildUpdateProductAudit,
  buildDeleteProductAudit,
  type ProductChangedFields,
} from '../../common/state-machines/product-audit';

const PRODUCT_INCLUDE = {
  plants: {
    include: { storageLocation: { select: { id: true, code: true, name: true } } },
    orderBy: [{ shopId: 'asc' }],
  },
  specifications: { orderBy: [{ sortOrder: 'asc' }] },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

type BulkUpsertRowStatus = 'created' | 'updated' | 'validated' | 'failed';

type BulkUpsertRowResult = {
  row: number;
  status: BulkUpsertRowStatus;
  action: 'create' | 'update';
  productCode: string;
  shopNumber: string;
  message: string;
  warnings: string[];
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly subscriptions: SubscriptionService,
    private readonly numbers: DocumentNumberService,
    private readonly series: DocumentSeriesService,
    private readonly images: ProductImageStorageService,
    private readonly audit: AuditService,
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

  private plantBatchExpiryFields(plant: Pick<ProductPlantDto, 'batchNumber' | 'expiryDate'>) {
    const batchNumber = plant.batchNumber?.trim() || null;
    const expiryRaw = plant.expiryDate?.trim();
    return {
      batchNumber,
      expiryDate: expiryRaw ? new Date(`${expiryRaw}T00:00:00.000Z`) : null,
    };
  }

  private openingStockRemarks(plant: Pick<ProductPlantDto, 'batchNumber' | 'expiryDate'>): string {
    const batchNumber = plant.batchNumber?.trim();
    const expiryDate = plant.expiryDate?.trim();
    const parts = ['Opening stock'];
    if (batchNumber) parts.push(`batch:${batchNumber}`);
    if (expiryDate) parts.push(`expiry:${expiryDate}`);
    return parts.join(' | ');
  }

  /** Decode the per-plant decimals returned by Prisma into plain numbers. */
  private decoratePlant<
    T extends {
      openingStock: Prisma.Decimal;
      minStockLevel: Prisma.Decimal;
      maxStockLevel: Prisma.Decimal | null;
      reorderQty: Prisma.Decimal | null;
      batchNumber?: string | null;
      expiryDate?: Date | null;
    },
  >(plant: T) {
    return {
      ...plant,
      openingStock: Number(plant.openingStock),
      minStockLevel: Number(plant.minStockLevel),
      maxStockLevel: plant.maxStockLevel == null ? null : Number(plant.maxStockLevel),
      reorderQty: plant.reorderQty == null ? null : Number(plant.reorderQty),
      batchNumber: plant.batchNumber ?? null,
      expiryDate: plant.expiryDate ? plant.expiryDate.toISOString().slice(0, 10) : null,
    };
  }

  private serializeProduct(product: ProductRow) {
    return {
      ...product,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      gstRate: Number(product.gstRate ?? 0),
      plants: product.plants.map((plant) => this.decoratePlant(plant)),
    };
  }

  private skuPrefixForCategory(category: string) {
    const letters = category.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (letters.slice(0, 3) || 'PRD').padEnd(3, 'X');
  }

  private async nextGeneratedProductCode(
    tx: Prisma.TransactionClient | PrismaService,
    category: string,
    reservedCodes: Set<string>,
  ) {
    const prefix = this.skuPrefixForCategory(category);
    const existing = await tx.product.findMany({
      where: { productCode: { startsWith: prefix } },
      select: { productCode: true },
      orderBy: { productCode: 'desc' },
      take: 500,
    });
    const known = new Set(
      [...reservedCodes, ...existing.map((row) => row.productCode)]
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    );
    let sequence = 1;
    for (const code of known) {
      if (!code.startsWith(prefix)) continue;
      const suffix = code.slice(prefix.length);
      if (/^\d+$/.test(suffix)) {
        sequence = Math.max(sequence, Number(suffix) + 1);
      }
    }
    while (sequence < Number.MAX_SAFE_INTEGER) {
      const nextCode = `${prefix}${String(sequence).padStart(3, '0')}`;
      if (!known.has(nextCode)) {
        reservedCodes.add(nextCode);
        return nextCode;
      }
      sequence += 1;
    }
    const fallback = `${prefix}${Date.now().toString().slice(-6)}`;
    reservedCodes.add(fallback);
    return fallback;
  }

  private async resolveGeneratedProductCode(
    tx: Prisma.TransactionClient,
    companyId: string,
    shopId: string,
    category: string,
    reservedCodes: Set<string>,
  ) {
    const config = await this.series.resolveEffectiveConfigInTx(tx, companyId, shopId, 'PRD');
    if (config.useCategoryPrefix) {
      return this.nextGeneratedProductCode(tx, category, reservedCodes);
    }
    return this.numbers.nextConfiguredShopScopedNumber(tx, {
      shopId,
      docType: 'PRD',
      date: new Date(),
    });
  }

  private async buildStockBalanceMap(
    tx: Prisma.TransactionClient | PrismaService,
    productIds: string[],
    shopIds?: string[],
  ) {
    return this.stock.buildStockBalanceMap(tx, productIds, shopIds);
  }

  private async getAccessibleShops(
    user: RequestUser,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const tenantShopIds = shopIdsForUser(user);
    const companyId = requireCompanyId(user);
    return tx.shop.findMany({
      where:
        tenantShopIds && tenantShopIds.length > 0
          ? { id: { in: tenantShopIds } }
          : { companyId },
      select: { id: true, shopNumber: true, shopName: true },
      orderBy: [{ shopNumber: 'asc' }],
    });
  }

  private resolveShopForImportRow(
    user: RequestUser,
    row: BulkProductUpsertRowDto,
    shops: Array<{ id: string; shopNumber: string; shopName: string }>,
  ) {
    if (!row.shopNumber?.trim()) {
      if (!user.shopId) {
        throw new Error('Shop / plant is required');
      }
      const fallback = shops.find((shop) => shop.id === user.shopId);
      if (!fallback) {
        throw new Error('Selected plant is outside your access scope');
      }
      return fallback;
    }

    const lookup = row.shopNumber.trim().toLowerCase();
    const match = shops.find((shop) => {
      const combined = `${shop.shopNumber} - ${shop.shopName}`.toLowerCase();
      return (
        shop.shopNumber.toLowerCase() === lookup ||
        shop.shopName.toLowerCase() === lookup ||
        combined === lookup ||
        combined.replace(/\s+/g, ' ') === lookup.replace(/\s+/g, ' ')
      );
    });
    if (!match) {
      throw new Error(`Plant not found or not accessible: ${row.shopNumber}`);
    }
    assertShopScope(user, match.id);
    return match;
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
      company_catalog?: boolean;
    },
  ) {
    const limit = query.limit ? Math.min(500, Math.max(1, query.limit)) : clampTake(query.limit);
    const page = query.page && query.page > 0 ? query.page : 1;
    const skip = (page - 1) * limit;
    const companyId = requireCompanyId(user);
    const shopId = query.shop_id;
    if (query.shop_id) await verifyShopInTenant(this.prisma, user, query.shop_id);
    const tenantShopIds = shopIdsForUser(user);
    const plantScope = query.company_catalog
      ? { shop: { companyId } }
      : shopId != null
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

    const productIds = products.map((p) => p.id);
    const scopedShopIds = shopId
      ? [shopId]
      : tenantShopIds && tenantShopIds.length > 0
        ? tenantShopIds
        : undefined;
    const balances = await this.buildStockBalanceMap(this.prisma, productIds, scopedShopIds);
    const stockByProduct = new Map<string, Record<string, number>>();
    for (const [key, balance] of balances.entries()) {
      const [productId, balanceShopId] = key.split(':');
      const map = stockByProduct.get(productId) ?? {};
      map[balanceShopId] = balance;
      stockByProduct.set(productId, map);
    }

    return {
      data: products.map((product) => {
        const stockByShop = stockByProduct.get(product.id) ?? {};
        const totalStock = Object.values(stockByShop).reduce((acc, n) => acc + n, 0);
        return {
          ...this.serializeProduct(product),
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
          gstRate: new Prisma.Decimal(dto.gstRate ?? 0),
          purchasePrice: new Prisma.Decimal(dto.purchasePrice),
          sellingPrice: new Prisma.Decimal(dto.sellingPrice),
          isActive: dto.isActive ?? true,
          createdById: user.id,
          plants: {
            create: dto.plants.map((plant) => ({
              shopId: plant.shopId,
              storageLocationId: plant.storageLocationId ?? null,
              openingStock: new Prisma.Decimal(plant.openingStock ?? 0),
              ...this.plantBatchExpiryFields(plant),
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
            remarks: this.openingStockRemarks(plant),
            userId: user.id,
          });
        }
      }

      await this.audit.log(
        buildCreateProductAudit({
          companyId: requireCompanyId(user),
          userId: user.id,
          productId: product.id,
          productCode: product.productCode,
          description: product.description,
        }),
        tx,
      );

      return this.serializeProduct(product);
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
    // Same stock decoration as list() so detail screens can show the
    // per-warehouse breakdown without a second round-trip.
    const balances = await this.buildStockBalanceMap(
      this.prisma,
      [product.id],
      tenantShopIds && tenantShopIds.length > 0 ? tenantShopIds : undefined,
    );
    const stockByShop: Record<string, number> = {};
    for (const [key, balance] of balances.entries()) {
      const [, balanceShopId] = key.split(':');
      stockByShop[balanceShopId] = balance;
    }
    const totalStock = Object.values(stockByShop).reduce((acc, n) => acc + n, 0);
    return {
      ...this.serializeProduct(product),
      stockByShop,
      totalStock,
      currentStock: user.shopId ? stockByShop[user.shopId] ?? 0 : totalStock,
    };
  }

  async setImage(user: RequestUser, id: string, file: Express.Multer.File) {
    // get() applies tenant/shop scoping and throws NotFound on miss.
    const product = await this.get(user, id);
    const stored = await this.images.store(id, file);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { imageUrl: stored.imageUrl, thumbnailUrl: stored.thumbnailUrl },
      include: PRODUCT_INCLUDE,
    });
    // Old files are orphaned once the record points elsewhere; remove them.
    await this.images.remove([product.imageUrl, product.thumbnailUrl]);
    return this.serializeProduct(updated);
  }

  async removeImage(user: RequestUser, id: string) {
    const product = await this.get(user, id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { imageUrl: null, thumbnailUrl: null },
      include: PRODUCT_INCLUDE,
    });
    await this.images.remove([product.imageUrl, product.thumbnailUrl]);
    return this.serializeProduct(updated);
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
      const changedFields: ProductChangedFields = {};

      // Track changes for audit
      if (dto.productCode !== undefined && dto.productCode !== existing.productCode) {
        changedFields.productCode = { old: existing.productCode, new: dto.productCode };
      }
      if (dto.description !== undefined && dto.description !== existing.description) {
        changedFields.description = { old: existing.description, new: dto.description };
      }
      if (dto.uom !== undefined && dto.uom !== existing.uom) {
        changedFields.uom = { old: existing.uom, new: dto.uom };
      }
      if (dto.category !== undefined && dto.category !== existing.category) {
        changedFields.category = { old: existing.category, new: dto.category ?? null };
      }
      if (dto.hsnCode !== undefined && dto.hsnCode !== existing.hsnCode) {
        changedFields.hsnCode = { old: existing.hsnCode, new: dto.hsnCode ?? null };
      }
      if (dto.materialGroup !== undefined && dto.materialGroup !== existing.materialGroup) {
        changedFields.materialGroup = { old: existing.materialGroup, new: dto.materialGroup ?? null };
      }
      if (dto.drawingReference !== undefined && dto.drawingReference !== existing.drawingReference) {
        changedFields.drawingReference = {
          old: existing.drawingReference,
          new: dto.drawingReference ?? null,
        };
      }
      if (dto.brand !== undefined && dto.brand !== existing.brand) {
        changedFields.brand = { old: existing.brand, new: dto.brand ?? null };
      }
      if (dto.taxPreference !== undefined && dto.taxPreference !== existing.taxPreference) {
        changedFields.taxPreference = { old: existing.taxPreference, new: dto.taxPreference };
      }
      if (dto.gstRate !== undefined && Number(dto.gstRate) !== Number(existing.gstRate)) {
        changedFields.gstRate = { old: Number(existing.gstRate), new: Number(dto.gstRate) };
      }
      if (
        dto.purchasePrice !== undefined &&
        Number(dto.purchasePrice) !== Number(existing.purchasePrice)
      ) {
        changedFields.purchasePrice = {
          old: Number(existing.purchasePrice),
          new: Number(dto.purchasePrice),
        };
      }
      if (
        dto.sellingPrice !== undefined &&
        Number(dto.sellingPrice) !== Number(existing.sellingPrice)
      ) {
        changedFields.sellingPrice = {
          old: Number(existing.sellingPrice),
          new: Number(dto.sellingPrice),
        };
      }
      if (dto.isActive !== undefined && dto.isActive !== existing.isActive) {
        changedFields.isActive = { old: existing.isActive, new: dto.isActive };
      }

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
          gstRate: dto.gstRate !== undefined ? new Prisma.Decimal(dto.gstRate) : undefined,
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
                ...this.plantBatchExpiryFields(incoming),
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
                ...this.plantBatchExpiryFields(incoming),
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
              remarks: this.openingStockRemarks(incoming),
              userId: user.id,
            });
          }
        }
      }

      // Log audit if any fields changed
      if (Object.keys(changedFields).length > 0) {
        await this.audit.log(
          buildUpdateProductAudit({
            companyId: requireCompanyId(user),
            userId: user.id,
            productId: updated.id,
            productCode: updated.productCode,
            changedFields,
          }),
          tx,
        );
      }

      const refreshed = await tx.product.findUniqueOrThrow({
        where: { id },
        include: PRODUCT_INCLUDE,
      });
      return this.serializeProduct(refreshed);
    });
  }

  async deletionImpact(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    const shopIds = existing.plants.map((plant) => plant.shopId);
    const [relatedUsage, stockBalances, shops] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.goodsReceiptItem.count({ where: { productId: id } }),
        this.prisma.goodsIssueItem.count({ where: { productId: id } }),
        this.prisma.purchaseOrderItem.count({ where: { productId: id } }),
        this.prisma.damagedStock.count({ where: { productId: id } }),
        this.prisma.stockLedger.count({ where: { productId: id } }),
      ]),
      this.buildStockBalanceMap(this.prisma, [id], shopIds),
      this.prisma.shop.findMany({
        where: { id: { in: shopIds } },
        select: { id: true, shopNumber: true, shopName: true },
      }),
    ]);

    const [goodsReceiptCount, goodsIssueCount, purchaseOrderCount, damagedCount, ledgerCount] =
      relatedUsage;
    const currentStock = Array.from(stockBalances.entries())
      .filter(([key]) => key.startsWith(`${id}:`))
      .reduce((sum, [, balance]) => sum + balance, 0);
    const historyCount =
      goodsReceiptCount + goodsIssueCount + purchaseOrderCount + damagedCount + ledgerCount;

    let reason = 'This product can be deleted.';
    if (currentStock > 0 && historyCount > 0) {
      reason =
        'Cannot delete this product because stock is still available and transaction history already exists. Deactivate it instead.';
    } else if (currentStock > 0) {
      reason =
        'Cannot delete this product because stock is still available in one or more plants. Move the stock to zero first or deactivate it instead.';
    } else if (historyCount > 0) {
      reason =
        'Cannot delete this product because transaction history already exists, even though visible stock is zero. Deactivate it instead.';
    }

    return {
      canDelete: currentStock === 0 && historyCount === 0,
      reason,
      suggestedAction: currentStock === 0 && historyCount === 0 ? null : 'deactivate',
      currentStock,
      historyCount,
      history: {
        goodsReceipts: goodsReceiptCount,
        goodsIssues: goodsIssueCount,
        purchaseOrders: purchaseOrderCount,
        damaged: damagedCount,
        stockLedger: ledgerCount,
      },
      plants: existing.plants.map((plant) => {
        const shop = shops.find((row) => row.id === plant.shopId);
        return {
          shopId: plant.shopId,
          shopNumber: shop?.shopNumber ?? plant.shopId,
          shopName: shop?.shopName ?? null,
          isActive: plant.isActive,
          currentStock: stockBalances.get(`${id}:${plant.shopId}`) ?? 0,
        };
      }),
    };
  }

  async remove(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    const impact = await this.deletionImpact(user, id);
    if (!impact.canDelete) {
      throw new BadRequestException({
        message: impact.reason,
        error: {
          message: impact.reason,
          code: 'PRODUCT_DELETE_BLOCKED',
          details: impact,
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });
      await this.audit.log(
        buildDeleteProductAudit({
          companyId: assertCompanyId(user),
          userId: user.id,
          productId: existing.id,
          productCode: existing.productCode,
          description: existing.description,
        }),
        tx,
      );
    });

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

  async bulkUpsert(user: RequestUser, dto: BulkProductUpsertDto) {
    const validateOnly = dto.validateOnly ?? false;
    const accessibleShops = await this.getAccessibleShops(user);
    const explicitCodes = [
      ...new Set(dto.rows.map((row) => row.productCode?.trim().toUpperCase()).filter(Boolean) as string[]),
    ];

    return this.prisma.$transaction(async (tx) => {
      const [existingProducts, locations] = await Promise.all([
        explicitCodes.length
          ? tx.product.findMany({
              where: { productCode: { in: explicitCodes } },
              include: PRODUCT_INCLUDE,
            })
          : Promise.resolve([] as ProductRow[]),
        accessibleShops.length
          ? tx.storageLocation.findMany({
              where: { shopId: { in: accessibleShops.map((shop) => shop.id) } },
              select: { id: true, shopId: true, code: true, name: true, isActive: true },
            })
          : Promise.resolve([] as Array<{ id: string; shopId: string; code: string; name: string; isActive: boolean }>),
      ]);

      const productByCode = new Map(existingProducts.map((product) => [product.productCode, product]));
      const reservedCodes = new Set(
        [...explicitCodes, ...existingProducts.map((product) => product.productCode)].map((value) =>
          value.trim().toUpperCase(),
        ),
      );
      const locationByKey = new Map(
        locations.map((location) => [
          `${location.shopId}:${location.code.trim().toUpperCase()}`,
          location,
        ]),
      );
      const locationsByShop = new Map<
        string,
        Array<{ id: string; shopId: string; code: string; name: string; isActive: boolean }>
      >();
      for (const location of locations) {
        const bucket = locationsByShop.get(location.shopId) ?? [];
        bucket.push(location);
        locationsByShop.set(location.shopId, bucket);
      }

      const stockBalances = await this.buildStockBalanceMap(
        tx,
        existingProducts.map((product) => product.id),
        accessibleShops.map((shop) => shop.id),
      );

      let created = 0;
      let updated = 0;
      let validated = 0;
      let failed = 0;
      const results: BulkUpsertRowResult[] = [];

      for (let index = 0; index < dto.rows.length; index += 1) {
        const row = dto.rows[index];
        const rowNumber = index + 2;
        try {
          const result = await this.applyBulkUpsertRow(
            tx,
            user,
            row,
            rowNumber,
            validateOnly,
            productByCode,
            reservedCodes,
            accessibleShops,
            locationByKey,
            locationsByShop,
            stockBalances,
          );
          results.push(result);
          if (result.status === 'created') created += 1;
          else if (result.status === 'updated') updated += 1;
          else if (result.status === 'validated') validated += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          failed += 1;
          results.push({
            row: rowNumber,
            status: 'failed',
            action: row.productCode ? 'update' : 'create',
            productCode: row.productCode?.trim().toUpperCase() || '(new product)',
            shopNumber: row.shopNumber?.trim() || user.shopId || '(unknown plant)',
            message,
            warnings: [],
          });
        }
      }

      return {
        validateOnly,
        total: dto.rows.length,
        created,
        updated,
        validated,
        failed,
        results,
        errors: results
          .filter((result) => result.status === 'failed')
          .map((result) => ({ row: result.row, message: result.message })),
      };
    });
  }

  private async applyBulkUpsertRow(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    row: BulkProductUpsertRowDto,
    rowNumber: number,
    validateOnly: boolean,
    productByCode: Map<string, ProductRow>,
    reservedCodes: Set<string>,
    shops: Array<{ id: string; shopNumber: string; shopName: string }>,
    locationByKey: Map<string, { id: string; shopId: string; code: string; name: string; isActive: boolean }>,
    locationsByShop: Map<
      string,
      Array<{ id: string; shopId: string; code: string; name: string; isActive: boolean }>
    >,
    stockBalances: Map<string, number>,
  ): Promise<BulkUpsertRowResult> {
    const shop = this.resolveShopForImportRow(user, row, shops);
    const warnings: string[] = [];
    if (Number(row.sellingPrice) < Number(row.purchasePrice)) {
      warnings.push('Selling price is lower than purchase price.');
    }

    const incomingCode = row.productCode?.trim().toUpperCase();
    const companyId = requireCompanyId(user);
    const productCode =
      incomingCode ??
      (await this.resolveGeneratedProductCode(tx, companyId, shop.id, row.category, reservedCodes));
    const existing = incomingCode ? productByCode.get(incomingCode) : undefined;
    const action: 'create' | 'update' = existing ? 'update' : 'create';
    const rowLocations = (locationsByShop.get(shop.id) ?? []).filter((location) => location.isActive);

    let storageLocationId: string | null = null;
    if (row.storageLocationCode) {
      const location = locationByKey.get(`${shop.id}:${row.storageLocationCode.trim().toUpperCase()}`);
      if (!location || !location.isActive) {
        throw new Error(
          `Storage location not found for plant ${shop.shopNumber}: ${row.storageLocationCode}`,
        );
      }
      storageLocationId = location.id;
    } else if (!existing) {
      if (rowLocations.length === 1) {
        storageLocationId = rowLocations[0].id;
      } else if (rowLocations.length > 1) {
        throw new Error(
          `Storage location code is required for plant ${shop.shopNumber} because it has multiple active locations`,
        );
      }
    }

    const plantPayload: ProductPlantDto = {
      shopId: shop.id,
      storageLocationId: storageLocationId ?? undefined,
      openingStock: Number(row.openingStock ?? 0),
      batchNumber: row.batchNumber,
      expiryDate: row.expiryDate,
      minStockLevel: Number(row.minStockLevel ?? 0),
      maxStockLevel: row.maxStockLevel,
      reorderQty: row.reorderQty,
      isActive: row.isActive ?? true,
    };
    await this.validateAssignments(user, [plantPayload], tx);

    if (action === 'create') {
      const companyId = requireCompanyId(user);
      await this.subscriptions.assertSkuLimit(companyId);
      warnings.push(
        incomingCode ? 'SKU was not found and will be created as a new product.' : 'SKU will be auto-generated from the category.',
      );

      if (!validateOnly) {
        const created = await tx.product.create({
          data: {
            productCode,
            description: row.description,
            uom: row.uom,
            category: row.category,
            hsnCode: row.hsnCode ?? null,
            materialGroup: row.materialGroup ?? null,
            drawingReference: row.drawingReference ?? null,
            brand: row.brand ?? null,
            taxPreference: row.taxPreference ?? TaxPreference.TAXABLE,
            purchasePrice: new Prisma.Decimal(row.purchasePrice),
            sellingPrice: new Prisma.Decimal(row.sellingPrice),
            isActive: row.isActive ?? true,
            createdById: user.id,
            plants: {
              create: {
                shopId: shop.id,
                storageLocationId,
                openingStock: new Prisma.Decimal(row.openingStock ?? 0),
                ...this.plantBatchExpiryFields(row),
                minStockLevel: new Prisma.Decimal(row.minStockLevel ?? 0),
                maxStockLevel:
                  row.maxStockLevel === undefined ? null : new Prisma.Decimal(row.maxStockLevel),
                reorderQty:
                  row.reorderQty === undefined ? null : new Prisma.Decimal(row.reorderQty),
                isActive: row.isActive ?? true,
                createdById: user.id,
              },
            },
          },
          include: PRODUCT_INCLUDE,
        });

        if (Number(row.openingStock ?? 0) > 0) {
          await this.stock.postMovement(tx, {
            type: TransactionType.OPENING,
            ref: `BULK-IMPORT-${productCode}-${shop.id.slice(0, 8)}`,
            date: new Date(),
            shopId: shop.id,
            productId: created.id,
            inQty: Number(row.openingStock ?? 0),
            outQty: 0,
            remarks: this.openingStockRemarks(row),
            userId: user.id,
          });
        }

        productByCode.set(productCode, created);
        stockBalances.set(`${created.id}:${shop.id}`, Number(row.openingStock ?? 0));
      } else {
        const planned = {
          id: `planned:${productCode}`,
          productCode,
          description: row.description,
          uom: row.uom,
          category: row.category,
          hsnCode: row.hsnCode ?? null,
          materialGroup: row.materialGroup ?? null,
          drawingReference: row.drawingReference ?? null,
          brand: row.brand ?? null,
          taxPreference: row.taxPreference ?? TaxPreference.TAXABLE,
          purchasePrice: new Prisma.Decimal(row.purchasePrice),
          sellingPrice: new Prisma.Decimal(row.sellingPrice),
          isActive: row.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: user.id,
          updatedById: null,
          plants: [
            {
              id: `planned-plant:${productCode}:${shop.id}`,
              productId: `planned:${productCode}`,
              shopId: shop.id,
              storageLocationId,
              openingStock: new Prisma.Decimal(row.openingStock ?? 0),
              minStockLevel: new Prisma.Decimal(row.minStockLevel ?? 0),
              maxStockLevel:
                row.maxStockLevel === undefined ? null : new Prisma.Decimal(row.maxStockLevel),
              reorderQty:
                row.reorderQty === undefined ? null : new Prisma.Decimal(row.reorderQty),
              isActive: row.isActive ?? true,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdById: user.id,
              updatedById: null,
              storageLocation: storageLocationId
                ? {
                    id: storageLocationId,
                    code:
                      rowLocations.find((location) => location.id === storageLocationId)?.code ?? '',
                    name:
                      rowLocations.find((location) => location.id === storageLocationId)?.name ?? '',
                  }
                : null,
            },
          ],
          specifications: [],
        } as unknown as ProductRow;
        productByCode.set(productCode, planned);
        stockBalances.set(`${planned.id}:${shop.id}`, Number(row.openingStock ?? 0));
      }

      return {
        row: rowNumber,
        status: validateOnly ? 'validated' : 'created',
        action,
        productCode,
        shopNumber: shop.shopNumber,
        message: validateOnly
          ? `Ready to create ${productCode} in plant ${shop.shopNumber}`
          : `Created ${productCode} in plant ${shop.shopNumber}`,
        warnings,
      };
    }

    if (!existing) {
      throw new Error('Product not found for update');
    }
    const existingProduct = existing;
    const existingPlant = existingProduct.plants.find((plant) => plant.shopId === shop.id);
    const resolvedStorageLocationId =
      storageLocationId ?? existingPlant?.storageLocationId ?? (rowLocations.length === 1 ? rowLocations[0].id : null);
    if (!resolvedStorageLocationId && !existingPlant && rowLocations.length > 1) {
      throw new Error(
        `Storage location code is required for plant ${shop.shopNumber} because it has multiple active locations`,
      );
    }

    const currentStock = stockBalances.get(`${existingProduct.id}:${shop.id}`) ?? 0;
    if (Number(row.openingStock ?? 0) !== currentStock) {
      warnings.push(
        `Current stock will be synchronized from ${currentStock} to ${Number(row.openingStock ?? 0)}.`,
      );
    }

    if (!validateOnly) {
      await tx.product.update({
        where: { id: existingProduct.id },
        data: {
          description: row.description,
          uom: row.uom,
          category: row.category,
          hsnCode: row.hsnCode ?? null,
          materialGroup: row.materialGroup ?? null,
          drawingReference: row.drawingReference ?? null,
          brand: row.brand ?? null,
          taxPreference: row.taxPreference ?? TaxPreference.TAXABLE,
          purchasePrice: new Prisma.Decimal(row.purchasePrice),
          sellingPrice: new Prisma.Decimal(row.sellingPrice),
          isActive: row.isActive ?? true,
          updatedById: user.id,
        },
      });

      if (existingPlant) {
        await tx.productPlant.update({
          where: { id: existingPlant.id },
          data: {
            storageLocationId: resolvedStorageLocationId,
            openingStock: new Prisma.Decimal(row.openingStock ?? 0),
            ...this.plantBatchExpiryFields(row),
            minStockLevel: new Prisma.Decimal(row.minStockLevel ?? 0),
            maxStockLevel:
              row.maxStockLevel === undefined ? null : new Prisma.Decimal(row.maxStockLevel),
            reorderQty: row.reorderQty === undefined ? null : new Prisma.Decimal(row.reorderQty),
            isActive: row.isActive ?? existingPlant.isActive,
            updatedById: user.id,
          },
        });
      } else {
        await tx.productPlant.create({
          data: {
            productId: existingProduct.id,
            shopId: shop.id,
            storageLocationId: resolvedStorageLocationId,
            openingStock: new Prisma.Decimal(row.openingStock ?? 0),
            ...this.plantBatchExpiryFields(row),
            minStockLevel: new Prisma.Decimal(row.minStockLevel ?? 0),
            maxStockLevel:
              row.maxStockLevel === undefined ? null : new Prisma.Decimal(row.maxStockLevel),
            reorderQty: row.reorderQty === undefined ? null : new Prisma.Decimal(row.reorderQty),
            isActive: row.isActive ?? true,
            createdById: user.id,
          },
        });
      }

      await this.syncImportedStockLevel(tx, user, {
        productId: existingProduct.id,
        productCode,
        shopId: shop.id,
        currentStock,
        targetStock: Number(row.openingStock ?? 0),
      });
    }

    const balanceKey = `${existingProduct.id}:${shop.id}`;
    stockBalances.set(balanceKey, Number(row.openingStock ?? 0));
    if (existingPlant) {
      existingPlant.storageLocationId = resolvedStorageLocationId;
      existingPlant.openingStock = new Prisma.Decimal(row.openingStock ?? 0);
      existingPlant.minStockLevel = new Prisma.Decimal(row.minStockLevel ?? 0);
      existingPlant.maxStockLevel =
        row.maxStockLevel === undefined ? null : new Prisma.Decimal(row.maxStockLevel);
      existingPlant.reorderQty =
        row.reorderQty === undefined ? null : new Prisma.Decimal(row.reorderQty);
      existingPlant.isActive = row.isActive ?? existingPlant.isActive;
    } else {
      existingProduct.plants.push({
        id: `planned-plant:${productCode}:${shop.id}`,
        productId: existingProduct.id,
        shopId: shop.id,
        storageLocationId: resolvedStorageLocationId,
        openingStock: new Prisma.Decimal(row.openingStock ?? 0),
        minStockLevel: new Prisma.Decimal(row.minStockLevel ?? 0),
        maxStockLevel:
          row.maxStockLevel === undefined ? null : new Prisma.Decimal(row.maxStockLevel),
        reorderQty: row.reorderQty === undefined ? null : new Prisma.Decimal(row.reorderQty),
        isActive: row.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: user.id,
        updatedById: null,
        storageLocation: resolvedStorageLocationId
          ? {
              id: resolvedStorageLocationId,
              code:
                rowLocations.find((location) => location.id === resolvedStorageLocationId)?.code ?? '',
              name:
                rowLocations.find((location) => location.id === resolvedStorageLocationId)?.name ?? '',
            }
          : null,
      } as ProductRow['plants'][number]);
    }

    return {
      row: rowNumber,
      status: validateOnly ? 'validated' : 'updated',
      action,
      productCode,
      shopNumber: shop.shopNumber,
      message: validateOnly
        ? `Ready to update ${productCode} in plant ${shop.shopNumber}`
        : `Updated ${productCode} in plant ${shop.shopNumber}`,
      warnings,
    };
  }

  private async syncImportedStockLevel(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    args: {
      productId: string;
      productCode: string;
      shopId: string;
      currentStock: number;
      targetStock: number;
    },
  ) {
    const delta = Number(args.targetStock) - Number(args.currentStock);
    if (delta === 0) {
      return;
    }

    await this.stock.postMovement(tx, {
      type: delta > 0 ? TransactionType.OPENING : TransactionType.GOODS_ISSUE,
      ref: `BULK-SYNC-${args.productCode}-${args.shopId.slice(0, 8)}-${Date.now()}`,
      date: new Date(),
      shopId: args.shopId,
      productId: args.productId,
      inQty: delta > 0 ? delta : 0,
      outQty: delta < 0 ? Math.abs(delta) : 0,
      remarks: 'Bulk import stock sync',
      userId: user.id,
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

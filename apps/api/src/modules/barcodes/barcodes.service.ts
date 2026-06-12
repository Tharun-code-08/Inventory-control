import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BarcodeType, Prisma, ScanAction, ScanResult, ScanSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { requireCompanyId, shopIdsForUser } from '../../common/utils/shop-scope';
import { normalizeBarcode } from './barcode-normalize';
import { CreateBarcodeDto } from './dto/create-barcode.dto';
import { UpdateBarcodeDto } from './dto/update-barcode.dto';
import { ListBarcodesDto } from './dto/list-barcodes.dto';
import { CompanySettingsService } from '../company-settings/company-settings.service';

const LOOKUP_PRODUCT_SELECT = {
  id: true,
  productCode: true,
  description: true,
  uom: true,
  category: true,
  purchasePrice: true,
  sellingPrice: true,
  gstRate: true,
  isActive: true,
  barcodes: {
    select: { id: true, barcode: true, barcodeType: true, isPrimary: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

const DUPLICATE_SCAN_WINDOW_MS = 400;

@Injectable()
export class BarcodesService {
  private readonly recentScans = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  /** True when the same user scanned the same code within the debounce window. */
  private isDuplicateFire(userId: string, code: string, now = Date.now()): boolean {
    const key = `${userId}:${code}`;
    const last = this.recentScans.get(key);
    this.recentScans.set(key, now);
    if (this.recentScans.size > 10_000) {
      for (const [k, t] of this.recentScans) {
        if (now - t > DUPLICATE_SCAN_WINDOW_MS) this.recentScans.delete(k);
      }
    }
    return last !== undefined && now - last < DUPLICATE_SCAN_WINDOW_MS;
  }

  /** Tenant-scoped product access guard */
  private productScope(user: RequestUser): Prisma.ProductWhereInput {
    const companyId = requireCompanyId(user);
    const tenantShopIds = shopIdsForUser(user);
    return {
      plants: {
        some:
          tenantShopIds && tenantShopIds.length > 0
            ? { shopId: { in: tenantShopIds } }
            : { shop: { companyId } },
      },
    };
  }

  /** Resolve a scanned value to a product, logging the scan for audit. */
  async lookup(
    user: RequestUser,
    rawCode: string,
    action: ScanAction = ScanAction.LOOKUP,
    shopId?: string,
    source: ScanSource = ScanSource.API,
  ) {
    const companyId = requireCompanyId(user);
    const code = normalizeBarcode(rawCode);
    if (!code) {
      await this.log(companyId, user.id, rawCode.slice(0, 255), null, action, ScanResult.INVALID, shopId, source);
      throw new BadRequestException('Scanned barcode is empty or invalid');
    }

    const duplicate = this.isDuplicateFire(user.id, code);

    const barcode = await this.prisma.productBarcode.findUnique({
      where: { companyId_barcode: { companyId, barcode: code } },
      include: { product: { select: LOOKUP_PRODUCT_SELECT } },
    });

    const product =
      barcode?.product ??
      (await this.prisma.product.findFirst({
        where: { productCode: code, ...this.productScope(user) },
        select: LOOKUP_PRODUCT_SELECT,
      }));

    if (!duplicate) {
      await this.log(
        companyId,
        user.id,
        code,
        product?.id ?? null,
        action,
        product ? ScanResult.FOUND : ScanResult.NOT_FOUND,
        shopId,
        source,
      );
    }

    if (!product) {
      const policy = await this.companySettings.getUnknownBarcodePolicy(companyId);
      return { found: false as const, barcode: code, duplicate, policy };
    }

    return {
      found: true as const,
      barcode: code,
      duplicate,
      matchedType: barcode?.barcodeType ?? null,
      product,
    };
  }

  async listForProduct(user: RequestUser, productId: string) {
    await this.requireProduct(user, productId);
    return this.prisma.productBarcode.findMany({
      where: { productId },
      include: {
        supplier: {
          select: {
            id: true,
            supplierName: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async listAll(user: RequestUser, dto: ListBarcodesDto) {
    const companyId = requireCompanyId(user);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductBarcodeWhereInput = {
      companyId,
    };

    if (dto.barcodeType) {
      where.barcodeType = dto.barcodeType;
    }

    if (dto.supplierId) {
      where.supplierId = dto.supplierId;
    }

    if (dto.search) {
      where.OR = [
        { barcode: { contains: dto.search, mode: 'insensitive' } },
        {
          product: {
            OR: [
              { productCode: { contains: dto.search, mode: 'insensitive' } },
              { description: { contains: dto.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.productBarcode.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              description: true,
            },
          },
          supplier: {
            select: {
              id: true,
              supplierName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productBarcode.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(user: RequestUser, productId: string, dto: CreateBarcodeDto) {
    const companyId = requireCompanyId(user);
    await this.requireProduct(user, productId);

    const value = normalizeBarcode(dto.barcodeValue);
    if (!value) {
      throw new BadRequestException('Barcode value is empty or invalid');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.productBarcode.updateMany({ where: { productId }, data: { isPrimary: false } });
        }
        const created = await tx.productBarcode.create({
          data: {
            productId,
            companyId,
            barcode: value,
            barcodeType: dto.barcodeType ?? BarcodeType.CODE128,
            isPrimary: dto.isPrimary ?? false,
            supplierId: dto.supplierId ?? null,
          },
        });

        // Audit logging
        await tx.barcodeAuditLog.create({
          data: {
            companyId,
            barcodeId: created.id,
            barcode: value,
            productId,
            action: 'CREATED',
            userId: user.id,
          },
        });

        // History tracking
        await tx.barcodeHistory.create({
          data: {
            companyId,
            barcode: value,
            newProductId: productId,
            userId: user.id,
          },
        });

        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.productBarcode.findUnique({
            where: { companyId_barcode: { companyId, barcode: value } },
            include: { product: { select: { id: true, productCode: true, description: true } } },
        });
        throw new ConflictException(
          existing
            ? `Barcode is already assigned to ${existing.product.productCode} (${existing.product.description})`
            : 'Barcode is already assigned to another product',
        );
      }
      throw err;
    }
  }

  async update(user: RequestUser, id: string, dto: UpdateBarcodeDto) {
    const companyId = requireCompanyId(user);
    const barcode = await this.prisma.productBarcode.findFirst({
      where: { id, companyId },
    });
    if (!barcode) {
      throw new NotFoundException('Barcode not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.ProductBarcodeUpdateInput = {};
      const auditLogs: Prisma.BarcodeAuditLogCreateInput[] = [];

      if (dto.barcodeType !== undefined && dto.barcodeType !== barcode.barcodeType) {
        updateData.barcodeType = dto.barcodeType;
      }

      if (dto.supplierId !== undefined) {
        const oldSupplierId = barcode.supplierId;
        const newSupplierId = dto.supplierId ?? null;
        if (oldSupplierId !== newSupplierId) {
          updateData.supplier = newSupplierId ? { connect: { id: newSupplierId } } : { disconnect: true };
          if (oldSupplierId) {
            auditLogs.push({
              company: { connect: { id: companyId } },
              barcodeId: barcode.id,
              barcode: barcode.barcode,
              productId: barcode.productId,
              action: 'UNLINKED',
              userId: user.id,
              detail: { type: 'supplier', supplierId: oldSupplierId },
            });
          }
          if (newSupplierId) {
            auditLogs.push({
              company: { connect: { id: companyId } },
              barcodeId: barcode.id,
              barcode: barcode.barcode,
              productId: barcode.productId,
              action: 'LINKED',
              userId: user.id,
              detail: { type: 'supplier', supplierId: newSupplierId },
            });
          }
        }
      }

      if (dto.isPrimary !== undefined && dto.isPrimary !== barcode.isPrimary) {
        updateData.isPrimary = dto.isPrimary;
        if (dto.isPrimary) {
          await tx.productBarcode.updateMany({
            where: { productId: barcode.productId, id: { not: id } },
            data: { isPrimary: false },
          });
        }
        auditLogs.push({
          company: { connect: { id: companyId } },
          barcodeId: barcode.id,
          barcode: barcode.barcode,
          productId: barcode.productId,
          action: 'PRIMARY_CHANGED',
          userId: user.id,
          detail: { oldPrimary: barcode.isPrimary, newPrimary: dto.isPrimary },
        });
      }

      const updated = await tx.productBarcode.update({
        where: { id },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              description: true,
            },
          },
          supplier: {
            select: {
              id: true,
              supplierName: true,
            },
          },
        },
      });

      for (const log of auditLogs) {
        await tx.barcodeAuditLog.create({ data: log });
      }

      return updated;
    });
  }

  /**
   * Register the product's own productCode as its INTERNAL barcode so every
   * product is scannable even without a supplier barcode. Idempotent.
   */
  async generateInternal(user: RequestUser, productId: string) {
    const companyId = requireCompanyId(user);
    const product = await this.requireProduct(user, productId);

    const existing = await this.prisma.productBarcode.findFirst({
      where: { productId, barcodeType: BarcodeType.INTERNAL },
    });
    if (existing) return existing;

    const hasPrimary = await this.prisma.productBarcode.count({ where: { productId, isPrimary: true } });
    return this.prisma.productBarcode.create({
      data: {
        productId,
        companyId,
        barcode: product.productCode,
        barcodeType: BarcodeType.INTERNAL,
        isPrimary: hasPrimary === 0,
      },
    });
  }

  async remove(user: RequestUser, barcodeId: string) {
    const companyId = requireCompanyId(user);
    const barcode = await this.prisma.productBarcode.findFirst({ where: { id: barcodeId, companyId } });
    if (!barcode) {
      throw new NotFoundException('Barcode not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productBarcode.delete({ where: { id: barcodeId } });

      await tx.barcodeAuditLog.create({
        data: {
          companyId,
          barcodeId: barcode.id,
          barcode: barcode.barcode,
          productId: barcode.productId,
          action: 'DELETED',
          userId: user.id,
        },
      });
    });

    return { deleted: true };
  }

  async markInvalid(
    user: RequestUser,
    rawCode: string,
    action: ScanAction = ScanAction.LOOKUP,
    shopId?: string,
    source: ScanSource = ScanSource.API,
  ) {
    const companyId = requireCompanyId(user);
    const code = normalizeBarcode(rawCode) || rawCode.slice(0, 255);
    await this.log(companyId, user.id, code, null, action, ScanResult.INVALID, shopId, source);
    return { success: true };
  }

  async scanLogs(user: RequestUser, take = 50) {
    const companyId = requireCompanyId(user);
    return this.prisma.scanLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 200),
      include: { product: { select: { id: true, productCode: true, description: true } } },
    });
  }

  private async requireProduct(user: RequestUser, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, ...this.productScope(user) },
      select: { id: true, productCode: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async log(
    companyId: string,
    userId: string,
    barcode: string,
    productId: string | null,
    action: ScanAction,
    result: ScanResult,
    shopId?: string,
    source: ScanSource = ScanSource.API,
  ) {
    try {
      await this.prisma.scanLog.create({
        data: { companyId, shopId: shopId ?? null, barcode, productId, userId, action, result, source },
      });
    } catch {
      /* noop */
    }
  }
}

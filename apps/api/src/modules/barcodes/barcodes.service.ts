import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BarcodeType, Prisma, ScanAction, ScanResult, ScanSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { requireCompanyId, shopIdsForUser } from '../../common/utils/shop-scope';
import { normalizeBarcode } from './barcode-normalize';
import { CreateBarcodeDto } from './dto/create-barcode.dto';

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

/**
 * Some USB scanners double-fire the same code within a few milliseconds.
 * Repeat scans of the same user+barcode inside this window are flagged as
 * duplicates so clients can skip adding a second quantity.
 */
const DUPLICATE_SCAN_WINDOW_MS = 400;

@Injectable()
export class BarcodesService {
  private readonly recentScans = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /** True when the same user scanned the same code within the debounce window. */
  private isDuplicateFire(userId: string, code: string, now = Date.now()): boolean {
    const key = `${userId}:${code}`;
    const last = this.recentScans.get(key);
    this.recentScans.set(key, now);
    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (this.recentScans.size > 10_000) {
      for (const [k, t] of this.recentScans) {
        if (now - t > DUPLICATE_SCAN_WINDOW_MS) this.recentScans.delete(k);
      }
    }
    return last !== undefined && now - last < DUPLICATE_SCAN_WINDOW_MS;
  }

  /**
   * Tenant-scoped product access guard: the product must have a plant in one
   * of the user's shops (or any shop of the user's company).
   */
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

    // Fall back to direct product-code match so freshly created products are
    // scannable before an internal barcode has been registered.
    const product =
      barcode?.product ??
      (await this.prisma.product.findFirst({
        where: { productCode: code, ...this.productScope(user) },
        select: LOOKUP_PRODUCT_SELECT,
      }));

    // A double-fired scan still resolves, but is flagged so clients skip the
    // second quantity bump, and it doesn't pollute logs or velocity counters.
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

      if (barcode) {
        // Cheap per-barcode velocity counters so "most scanned" / dead-stock
        // queries don't need to aggregate scan_logs. Best-effort like logging.
        /* scan count and lastScannedAt tracking removed as fields no longer exist */
      }
    }

    if (!product) {
      // Structured "not found" so the client can offer recovery actions
      // (map to existing product / create product / rescan) instead of a 404.
      return { found: false as const, barcode: code, duplicate };
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
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
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
        return tx.productBarcode.create({
          data: {
            productId,
            companyId,
            barcode: value,
            barcodeType: dto.barcodeType ?? BarcodeType.CODE128,
            isPrimary: dto.isPrimary ?? false,
            // createdById field removed (not in schema)
          },
        });
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
        createdById: user.id,
      },
    });
  }

  async remove(user: RequestUser, barcodeId: string) {
    const companyId = requireCompanyId(user);
    const barcode = await this.prisma.productBarcode.findFirst({ where: { id: barcodeId, companyId } });
    if (!barcode) {
      throw new NotFoundException('Barcode not found');
    }
    await this.prisma.productBarcode.delete({ where: { id: barcodeId } });
    return { deleted: true };
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
    // Audit logging must never break the scan flow.
    try {
      await this.prisma.scanLog.create({
        data: { companyId, shopId: shopId ?? null, barcode, productId, userId, action, result, source },
      });
    } catch {
      /* noop */
    }
  }
}

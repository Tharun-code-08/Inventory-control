"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const barcode_normalize_1 = require("./barcode-normalize");
const company_settings_service_1 = require("../company-settings/company-settings.service");
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
};
const DUPLICATE_SCAN_WINDOW_MS = 400;
let BarcodesService = class BarcodesService {
    prisma;
    companySettings;
    recentScans = new Map();
    constructor(prisma, companySettings) {
        this.prisma = prisma;
        this.companySettings = companySettings;
    }
    isDuplicateFire(userId, code, now = Date.now()) {
        const key = `${userId}:${code}`;
        const last = this.recentScans.get(key);
        this.recentScans.set(key, now);
        if (this.recentScans.size > 10_000) {
            for (const [k, t] of this.recentScans) {
                if (now - t > DUPLICATE_SCAN_WINDOW_MS)
                    this.recentScans.delete(k);
            }
        }
        return last !== undefined && now - last < DUPLICATE_SCAN_WINDOW_MS;
    }
    productScope(user) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const tenantShopIds = (0, shop_scope_1.shopIdsForUser)(user);
        return {
            plants: {
                some: tenantShopIds && tenantShopIds.length > 0
                    ? { shopId: { in: tenantShopIds } }
                    : { shop: { companyId } },
            },
        };
    }
    async lookup(user, rawCode, action = client_1.ScanAction.LOOKUP, shopId, source = client_1.ScanSource.API) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const code = (0, barcode_normalize_1.normalizeBarcode)(rawCode);
        if (!code) {
            await this.log(companyId, user.id, rawCode.slice(0, 255), null, action, client_1.ScanResult.INVALID, shopId, source);
            throw new common_1.BadRequestException('Scanned barcode is empty or invalid');
        }
        const duplicate = this.isDuplicateFire(user.id, code);
        const barcode = await this.prisma.productBarcode.findUnique({
            where: { companyId_barcode: { companyId, barcode: code } },
            include: { product: { select: LOOKUP_PRODUCT_SELECT } },
        });
        const product = barcode?.product ??
            (await this.prisma.product.findFirst({
                where: { productCode: code, ...this.productScope(user) },
                select: LOOKUP_PRODUCT_SELECT,
            }));
        if (!duplicate) {
            await this.log(companyId, user.id, code, product?.id ?? null, action, product ? client_1.ScanResult.FOUND : client_1.ScanResult.NOT_FOUND, shopId, source);
        }
        if (!product) {
            const policy = await this.companySettings.getUnknownBarcodePolicy(companyId);
            return { found: false, barcode: code, duplicate, policy };
        }
        return {
            found: true,
            barcode: code,
            duplicate,
            matchedType: barcode?.barcodeType ?? null,
            product,
        };
    }
    async listForProduct(user, productId) {
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
    async listAll(user, dto) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 20;
        const skip = (page - 1) * limit;
        const where = {
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
    async create(user, productId, dto) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        await this.requireProduct(user, productId);
        const value = (0, barcode_normalize_1.normalizeBarcode)(dto.barcodeValue);
        if (!value) {
            throw new common_1.BadRequestException('Barcode value is empty or invalid');
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
                        barcodeType: dto.barcodeType ?? client_1.BarcodeType.CODE128,
                        isPrimary: dto.isPrimary ?? false,
                        supplierId: dto.supplierId ?? null,
                    },
                });
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
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                const existing = await this.prisma.productBarcode.findUnique({
                    where: { companyId_barcode: { companyId, barcode: value } },
                    include: { product: { select: { id: true, productCode: true, description: true } } },
                });
                throw new common_1.ConflictException(existing
                    ? `Barcode is already assigned to ${existing.product.productCode} (${existing.product.description})`
                    : 'Barcode is already assigned to another product');
            }
            throw err;
        }
    }
    async update(user, id, dto) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const barcode = await this.prisma.productBarcode.findFirst({
            where: { id, companyId },
        });
        if (!barcode) {
            throw new common_1.NotFoundException('Barcode not found');
        }
        return await this.prisma.$transaction(async (tx) => {
            const updateData = {};
            const auditLogs = [];
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
    async generateInternal(user, productId) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const product = await this.requireProduct(user, productId);
        const existing = await this.prisma.productBarcode.findFirst({
            where: { productId, barcodeType: client_1.BarcodeType.INTERNAL },
        });
        if (existing)
            return existing;
        const hasPrimary = await this.prisma.productBarcode.count({ where: { productId, isPrimary: true } });
        return this.prisma.productBarcode.create({
            data: {
                productId,
                companyId,
                barcode: product.productCode,
                barcodeType: client_1.BarcodeType.INTERNAL,
                isPrimary: hasPrimary === 0,
            },
        });
    }
    async remove(user, barcodeId) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const barcode = await this.prisma.productBarcode.findFirst({ where: { id: barcodeId, companyId } });
        if (!barcode) {
            throw new common_1.NotFoundException('Barcode not found');
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
    async markInvalid(user, rawCode, action = client_1.ScanAction.LOOKUP, shopId, source = client_1.ScanSource.API) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const code = (0, barcode_normalize_1.normalizeBarcode)(rawCode) || rawCode.slice(0, 255);
        await this.log(companyId, user.id, code, null, action, client_1.ScanResult.INVALID, shopId, source);
        return { success: true };
    }
    async scanLogs(user, take = 50) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        return this.prisma.scanLog.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(take, 1), 200),
            include: { product: { select: { id: true, productCode: true, description: true } } },
        });
    }
    async requireProduct(user, productId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, ...this.productScope(user) },
            select: { id: true, productCode: true },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async log(companyId, userId, barcode, productId, action, result, shopId, source = client_1.ScanSource.API) {
        try {
            await this.prisma.scanLog.create({
                data: { companyId, shopId: shopId ?? null, barcode, productId, userId, action, result, source },
            });
        }
        catch {
        }
    }
};
exports.BarcodesService = BarcodesService;
exports.BarcodesService = BarcodesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        company_settings_service_1.CompanySettingsService])
], BarcodesService);
//# sourceMappingURL=barcodes.service.js.map
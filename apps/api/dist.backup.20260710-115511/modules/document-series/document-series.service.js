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
exports.DocumentSeriesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const document_series_constants_1 = require("./document-series.constants");
let DocumentSeriesService = class DocumentSeriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    assertOrgAdmin(user) {
        if (user.role !== client_1.RoleName.OWNER && user.role !== client_1.RoleName.ADMIN) {
            throw new common_1.ForbiddenException('Only organization admins can manage document series');
        }
    }
    requireCompanyId(user) {
        if (!user.companyId) {
            throw new common_1.BadRequestException('Company context is required');
        }
        return user.companyId;
    }
    sequenceBucket(date, restartPeriod) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        if (restartPeriod === client_1.DocumentSeriesRestart.MONTHLY)
            return `${y}${m}`;
        if (restartPeriod === client_1.DocumentSeriesRestart.YEARLY)
            return `${y}`;
        return '000000';
    }
    sanitizePrefix(prefix) {
        return prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    }
    shopScopedPrefix(shopNumber, basePrefix) {
        const safe = shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GEN';
        return `${this.sanitizePrefix(basePrefix)}-${safe}`;
    }
    buildPreview(config, shopNumber = 'HQ001', date = new Date()) {
        const prefix = config.shopScoped
            ? this.shopScopedPrefix(shopNumber, config.prefix)
            : this.sanitizePrefix(config.prefix);
        const bucket = this.sequenceBucket(date, config.restartPeriod);
        const padded = String(config.startingNumber).padStart(config.padWidth, '0');
        if (config.restartPeriod === client_1.DocumentSeriesRestart.NONE) {
            return `${prefix}-${padded}`;
        }
        return `${prefix}-${bucket}-${padded}`;
    }
    toResolved(moduleDef, row, isOverride = false) {
        return {
            docType: moduleDef.docType,
            moduleLabel: moduleDef.moduleLabel,
            prefix: row?.prefix ?? moduleDef.defaultPrefix,
            startingNumber: row?.startingNumber ?? moduleDef.defaultStartingNumber,
            padWidth: row?.padWidth ?? moduleDef.defaultPadWidth,
            restartPeriod: row?.restartPeriod ?? moduleDef.defaultRestartPeriod,
            shopScoped: row?.shopScoped ?? moduleDef.shopScoped,
            enabled: row?.enabled ?? true,
            useCategoryPrefix: row?.useCategoryPrefix ?? moduleDef.defaultUseCategoryPrefix ?? false,
            isOverride,
        };
    }
    async ensureCompanyDefaults(companyId, userId) {
        const existing = await this.prisma.documentSeriesConfig.findMany({
            where: { companyId, shopId: null },
            select: { docType: true },
        });
        const existingTypes = new Set(existing.map((row) => row.docType));
        const missing = document_series_constants_1.DOCUMENT_SERIES_MODULES.filter((module) => !existingTypes.has(module.docType));
        if (missing.length === 0)
            return;
        await this.prisma.documentSeriesConfig.createMany({
            data: missing.map((module) => ({
                companyId,
                shopId: null,
                docType: module.docType,
                moduleLabel: module.moduleLabel,
                prefix: module.defaultPrefix,
                startingNumber: module.defaultStartingNumber,
                padWidth: module.defaultPadWidth,
                restartPeriod: module.defaultRestartPeriod,
                shopScoped: module.shopScoped,
                enabled: true,
                useCategoryPrefix: module.defaultUseCategoryPrefix ?? false,
                createdById: userId ?? null,
                updatedById: userId ?? null,
            })),
        });
    }
    async resolveEffectiveConfig(companyId, shopId, docType) {
        const moduleDef = (0, document_series_constants_1.getBuiltInSeriesDefault)(docType);
        if (!moduleDef) {
            throw new common_1.BadRequestException(`Unsupported document type: ${docType}`);
        }
        await this.ensureCompanyDefaults(companyId);
        const [companyRow, shopRow] = await Promise.all([
            this.prisma.documentSeriesConfig.findFirst({
                where: { companyId, shopId: null, docType },
            }),
            this.prisma.documentSeriesConfig.findFirst({
                where: { companyId, shopId, docType },
            }),
        ]);
        if (shopRow) {
            return this.toResolved(moduleDef, shopRow, true);
        }
        return this.toResolved(moduleDef, companyRow, false);
    }
    async resolveEffectiveConfigInTx(tx, companyId, shopId, docType) {
        const moduleDef = (0, document_series_constants_1.getBuiltInSeriesDefault)(docType);
        if (!moduleDef) {
            throw new common_1.BadRequestException(`Unsupported document type: ${docType}`);
        }
        const existingCompany = await tx.documentSeriesConfig.findFirst({
            where: { companyId, shopId: null, docType },
        });
        if (!existingCompany) {
            await tx.documentSeriesConfig.create({
                data: {
                    companyId,
                    shopId: null,
                    docType: moduleDef.docType,
                    moduleLabel: moduleDef.moduleLabel,
                    prefix: moduleDef.defaultPrefix,
                    startingNumber: moduleDef.defaultStartingNumber,
                    padWidth: moduleDef.defaultPadWidth,
                    restartPeriod: moduleDef.defaultRestartPeriod,
                    shopScoped: moduleDef.shopScoped,
                    enabled: true,
                    useCategoryPrefix: moduleDef.defaultUseCategoryPrefix ?? false,
                },
            });
        }
        const [companyRow, shopRow] = await Promise.all([
            tx.documentSeriesConfig.findFirst({
                where: { companyId, shopId: null, docType },
            }),
            tx.documentSeriesConfig.findFirst({
                where: { companyId, shopId, docType },
            }),
        ]);
        if (shopRow) {
            return this.toResolved(moduleDef, shopRow, true);
        }
        return this.toResolved(moduleDef, companyRow, false);
    }
    async resolvePreviewShop(companyId, shopId) {
        if (shopId) {
            const shop = await this.prisma.shop.findFirst({
                where: { id: shopId, companyId },
                select: { shopNumber: true },
            });
            if (shop)
                return shop.shopNumber;
        }
        const firstShop = await this.prisma.shop.findFirst({
            where: { companyId, isActive: true },
            orderBy: { shopNumber: 'asc' },
            select: { shopNumber: true },
        });
        return firstShop?.shopNumber ?? 'HQ001';
    }
    async currentSequenceFor(shopId, docType, restartPeriod, date = new Date()) {
        const bucket = this.sequenceBucket(date, restartPeriod);
        const row = await this.prisma.documentSequence.findUnique({
            where: {
                docType_shopId_yearMonth: {
                    docType,
                    shopId,
                    yearMonth: bucket,
                },
            },
            select: { lastSeq: true },
        });
        return row?.lastSeq ?? null;
    }
    async listEffective(user, shopId) {
        this.assertOrgAdmin(user);
        const companyId = this.requireCompanyId(user);
        await this.ensureCompanyDefaults(companyId, user.id);
        if (shopId) {
            const shop = await this.prisma.shop.findFirst({
                where: { id: shopId, companyId },
                select: { id: true },
            });
            if (!shop)
                throw new common_1.NotFoundException('Shop not found');
        }
        const where = shopId
            ? { companyId, OR: [{ shopId: null }, { shopId }] }
            : { companyId, shopId: null };
        const rows = await this.prisma.documentSeriesConfig.findMany({ where });
        const companyByType = new Map(rows.filter((row) => row.shopId === null).map((row) => [row.docType, row]));
        const shopByType = new Map(rows.filter((row) => row.shopId !== null).map((row) => [row.docType, row]));
        const previewShopNumber = await this.resolvePreviewShop(companyId, shopId);
        const previewShopId = shopId ??
            (await this.prisma.shop.findFirst({
                where: { companyId, isActive: true },
                orderBy: { shopNumber: 'asc' },
                select: { id: true },
            }))?.id;
        const now = new Date();
        return Promise.all(document_series_constants_1.DOCUMENT_SERIES_MODULES.map(async (moduleDef) => {
            const sourceRow = shopId
                ? shopByType.get(moduleDef.docType) ?? companyByType.get(moduleDef.docType)
                : companyByType.get(moduleDef.docType);
            const resolved = this.toResolved(moduleDef, sourceRow ?? null, Boolean(shopId && shopByType.has(moduleDef.docType)));
            const bucket = this.sequenceBucket(now, resolved.restartPeriod);
            const currentSequence = previewShopId && resolved.docType !== 'PRD'
                ? await this.currentSequenceFor(previewShopId, resolved.docType, resolved.restartPeriod, now)
                : null;
            return {
                ...resolved,
                preview: this.buildPreview(resolved, previewShopNumber, now),
                currentSequence,
                sequenceBucket: bucket,
            };
        }));
    }
    normalizeRowInput(row, moduleDef) {
        return {
            prefix: row.prefix ? this.sanitizePrefix(row.prefix) : moduleDef.defaultPrefix,
            startingNumber: row.startingNumber ?? moduleDef.defaultStartingNumber,
            padWidth: row.padWidth ?? moduleDef.defaultPadWidth,
            restartPeriod: client_1.DocumentSeriesRestart.NONE,
            shopScoped: false,
            enabled: row.enabled ?? true,
            useCategoryPrefix: row.useCategoryPrefix ?? moduleDef.defaultUseCategoryPrefix ?? false,
        };
    }
    async upsertCompanyRow(companyId, userId, row, moduleDef) {
        const data = this.normalizeRowInput(row, moduleDef);
        const existing = await this.prisma.documentSeriesConfig.findFirst({
            where: { companyId, shopId: null, docType: row.docType },
        });
        if (existing) {
            await this.prisma.documentSeriesConfig.update({
                where: { id: existing.id },
                data: {
                    ...data,
                    moduleLabel: moduleDef.moduleLabel,
                    updatedById: userId,
                },
            });
            return;
        }
        await this.prisma.documentSeriesConfig.create({
            data: {
                companyId,
                shopId: null,
                docType: row.docType,
                moduleLabel: moduleDef.moduleLabel,
                ...data,
                createdById: userId,
                updatedById: userId,
            },
        });
    }
    async updateCompanyDefaults(user, rows) {
        this.assertOrgAdmin(user);
        const companyId = this.requireCompanyId(user);
        await this.ensureCompanyDefaults(companyId, user.id);
        for (const row of rows) {
            const moduleDef = (0, document_series_constants_1.getBuiltInSeriesDefault)(row.docType);
            if (!moduleDef) {
                throw new common_1.BadRequestException(`Unsupported document type: ${row.docType}`);
            }
            await this.upsertCompanyRow(companyId, user.id, row, moduleDef);
        }
        return this.listEffective(user, null);
    }
    async updateShopOverrides(user, shopId, rows) {
        this.assertOrgAdmin(user);
        const companyId = this.requireCompanyId(user);
        const shop = await this.prisma.shop.findFirst({
            where: { id: shopId, companyId },
            select: { id: true },
        });
        if (!shop)
            throw new common_1.NotFoundException('Shop not found');
        await this.ensureCompanyDefaults(companyId, user.id);
        for (const row of rows) {
            const moduleDef = (0, document_series_constants_1.getBuiltInSeriesDefault)(row.docType);
            if (!moduleDef) {
                throw new common_1.BadRequestException(`Unsupported document type: ${row.docType}`);
            }
            const data = this.normalizeRowInput(row, moduleDef);
            const existing = await this.prisma.documentSeriesConfig.findFirst({
                where: { companyId, shopId, docType: row.docType },
            });
            if (existing) {
                await this.prisma.documentSeriesConfig.update({
                    where: { id: existing.id },
                    data: {
                        ...data,
                        moduleLabel: moduleDef.moduleLabel,
                        updatedById: user.id,
                    },
                });
            }
            else {
                await this.prisma.documentSeriesConfig.create({
                    data: {
                        companyId,
                        shopId,
                        docType: row.docType,
                        moduleLabel: moduleDef.moduleLabel,
                        ...data,
                        createdById: user.id,
                        updatedById: user.id,
                    },
                });
            }
        }
        return this.listEffective(user, shopId);
    }
    async deleteShopOverride(user, shopId, docType) {
        this.assertOrgAdmin(user);
        const companyId = this.requireCompanyId(user);
        const existing = await this.prisma.documentSeriesConfig.findFirst({
            where: { companyId, shopId, docType },
        });
        if (!existing)
            throw new common_1.NotFoundException('Shop override not found');
        await this.prisma.documentSeriesConfig.delete({ where: { id: existing.id } });
        return this.listEffective(user, shopId);
    }
};
exports.DocumentSeriesService = DocumentSeriesService;
exports.DocumentSeriesService = DocumentSeriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentSeriesService);
//# sourceMappingURL=document-series.service.js.map
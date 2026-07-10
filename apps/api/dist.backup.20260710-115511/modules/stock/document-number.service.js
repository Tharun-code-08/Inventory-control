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
exports.DocumentNumberService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const document_series_service_1 = require("../document-series/document-series.service");
let DocumentNumberService = class DocumentNumberService {
    prisma;
    series;
    constructor(prisma, series) {
        this.prisma = prisma;
        this.series = series;
    }
    shopScopedPrefix(shopNumber, basePrefix) {
        return this.series.shopScopedPrefix(shopNumber, basePrefix);
    }
    yearMonth(d) {
        return this.series.sequenceBucket(d, client_1.DocumentSeriesRestart.MONTHLY);
    }
    async nextShopScopedNumber(tx, params) {
        return this.nextConfiguredShopScopedNumber(tx, {
            shopId: params.shopId,
            docType: params.docType,
            date: params.date,
        });
    }
    async nextConfiguredShopScopedNumber(tx, params) {
        const shop = await tx.shop.findUnique({
            where: { id: params.shopId },
            select: { shopNumber: true, companyId: true },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Plant is not linked to a company. Open Settings → Plants and ensure the plant belongs to your organisation.');
        }
        const config = await this.series.resolveEffectiveConfigInTx(tx, shop.companyId, params.shopId, params.docType);
        const prefix = config.shopScoped
            ? this.shopScopedPrefix(shop.shopNumber, config.prefix)
            : this.series.sanitizePrefix(config.prefix);
        return this.nextNumberWithConfig(tx, {
            shopId: params.shopId,
            docType: params.docType,
            prefix,
            date: params.date,
            config,
        });
    }
    async nextNumber(tx, params) {
        const shop = await tx.shop.findUnique({
            where: { id: params.shopId },
            select: { companyId: true },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Plant is not linked to a company. Open Settings → Plants and ensure the plant belongs to your organisation.');
        }
        const config = await this.series.resolveEffectiveConfigInTx(tx, shop.companyId, params.shopId, params.docType);
        return this.nextNumberWithConfig(tx, {
            shopId: params.shopId,
            docType: params.docType,
            prefix: params.prefix || this.series.sanitizePrefix(config.prefix),
            date: params.date,
            config,
        });
    }
    async nextConfiguredNumber(tx, params) {
        const shop = await tx.shop.findUnique({
            where: { id: params.shopId },
            select: { shopNumber: true, companyId: true },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Plant is not linked to a company. Open Settings → Plants and ensure the plant belongs to your organisation.');
        }
        const config = await this.series.resolveEffectiveConfigInTx(tx, shop.companyId, params.shopId, params.docType);
        const prefix = config.shopScoped
            ? this.shopScopedPrefix(shop.shopNumber, config.prefix)
            : this.series.sanitizePrefix(config.prefix);
        return this.nextNumberWithConfig(tx, {
            shopId: params.shopId,
            docType: params.docType,
            prefix,
            date: params.date,
            config,
        });
    }
    async nextNumberWithConfig(tx, params) {
        const bucket = this.series.sequenceBucket(params.date, params.config.restartPeriod);
        const key = `${params.docType}:${params.shopId}:${bucket}`;
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${key}::text))`;
        const existing = await tx.documentSequence.findUnique({
            where: {
                docType_shopId_yearMonth: {
                    docType: params.docType,
                    shopId: params.shopId,
                    yearMonth: bucket,
                },
            },
        });
        const floor = Math.max(1, params.config.startingNumber);
        const nextSeq = Math.max((existing?.lastSeq ?? floor - 1) + 1, floor);
        await tx.documentSequence.upsert({
            where: {
                docType_shopId_yearMonth: {
                    docType: params.docType,
                    shopId: params.shopId,
                    yearMonth: bucket,
                },
            },
            create: {
                docType: params.docType,
                shopId: params.shopId,
                yearMonth: bucket,
                lastSeq: nextSeq,
            },
            update: { lastSeq: nextSeq },
        });
        const padded = String(nextSeq).padStart(params.config.padWidth, '0');
        if (params.config.restartPeriod === client_1.DocumentSeriesRestart.NONE) {
            return `${params.prefix}-${padded}`;
        }
        return `${params.prefix}-${bucket}-${padded}`;
    }
};
exports.DocumentNumberService = DocumentNumberService;
exports.DocumentNumberService = DocumentNumberService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_series_service_1.DocumentSeriesService])
], DocumentNumberService);
//# sourceMappingURL=document-number.service.js.map
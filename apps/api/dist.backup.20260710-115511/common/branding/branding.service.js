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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BrandingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandingService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const ioredis_1 = require("ioredis");
const prisma_service_1 = require("../../prisma/prisma.service");
const branding_resolver_service_1 = require("./branding-resolver.service");
const storage_service_1 = require("../storage/storage.service");
const redis_provider_1 = require("../cache/redis.provider");
let BrandingService = BrandingService_1 = class BrandingService {
    prisma;
    brandingResolver;
    storage;
    redis;
    logger = new common_1.Logger(BrandingService_1.name);
    DEFAULT_DOCUMENT_SETTINGS = {
        INVOICE: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        PURCHASE_ORDER: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        QUOTATION: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        GOODS_ISSUE: {
            showLogo: true,
            showGST: true,
            showAddress: false,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        GOODS_RECEIPT: {
            showLogo: true,
            showGST: true,
            showAddress: false,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        EWAY_BILL: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        DELIVERY_CHALLAN: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        CREDIT_NOTE: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        DEBIT_NOTE: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        PRODUCTION_ORDER: {
            showLogo: true,
            showGST: false,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        SERVICE_ORDER: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        RFQ: {
            showLogo: true,
            showGST: false,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        DELIVERY_NOTE: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        STOCK_TRANSFER: {
            showLogo: true,
            showGST: false,
            showAddress: false,
            showFooter: false,
            showSignature: false,
            showSeal: false,
        },
        PURCHASE_RETURN: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        SALES_RETURN: {
            showLogo: true,
            showGST: true,
            showAddress: true,
            showFooter: true,
            showSignature: true,
            showSeal: false,
        },
        MATERIAL_REQUEST: {
            showLogo: true,
            showGST: false,
            showAddress: false,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        WORK_ORDER: {
            showLogo: true,
            showGST: false,
            showAddress: true,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
        REPORT: {
            showLogo: true,
            showGST: false,
            showAddress: false,
            showFooter: true,
            showSignature: false,
            showSeal: false,
        },
    };
    constructor(prisma, brandingResolver, storage, redis) {
        this.prisma = prisma;
        this.brandingResolver = brandingResolver;
        this.storage = storage;
        this.redis = redis;
    }
    async getCompanyBranding(companyId) {
        const cacheKey = `branding:company:${companyId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (err) {
            this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                companyName: true,
                address: true,
                brandingProfile: {
                    select: {
                        footerText: true,
                        email: true,
                        phone: true,
                        website: true,
                        brandingVersion: true,
                    },
                },
            },
        });
        if (!company)
            throw new common_1.BadRequestException('Company not found');
        const result = {
            companyName: company.companyName,
            address: company.address,
            email: company.brandingProfile?.email,
            phone: company.brandingProfile?.phone,
            website: company.brandingProfile?.website,
            footerText: company.brandingProfile?.footerText,
            brandingVersion: company.brandingProfile?.brandingVersion ?? 1,
        };
        try {
            await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
        }
        catch (err) {
            this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
        }
        return result;
    }
    async getBranchBranding(shopId) {
        const cacheKey = `branding:branch:${shopId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (err) {
            this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: {
                shopName: true,
                address: true,
                taxId: true,
                email: true,
                mobile: true,
                brandingProfile: {
                    select: {
                        footerText: true,
                        email: true,
                        phone: true,
                        website: true,
                        brandingVersion: true,
                    },
                },
            },
        });
        if (!shop)
            throw new common_1.BadRequestException('Shop not found');
        const result = {
            shopName: shop.shopName,
            address: shop.address,
            taxId: shop.taxId,
            email: shop.brandingProfile?.email || shop.email,
            phone: shop.brandingProfile?.phone || shop.mobile,
            website: shop.brandingProfile?.website,
            footerText: shop.brandingProfile?.footerText,
            brandingVersion: shop.brandingProfile?.brandingVersion ?? 1,
        };
        try {
            await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
        }
        catch (err) {
            this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
        }
        return result;
    }
    async getDocumentSettings(companyId, documentType) {
        const cacheKey = `branding:document:${companyId}:${documentType}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (err) {
            this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
        }
        const docBranding = await this.prisma.documentBranding.findUnique({
            where: {
                companyId_documentType: {
                    companyId,
                    documentType,
                },
            },
        });
        const settings = docBranding?.settings;
        const finalSettings = settings || this.DEFAULT_DOCUMENT_SETTINGS[documentType];
        if (this.redis) {
            try {
                await this.redis.setex(cacheKey, 3600, JSON.stringify(finalSettings));
            }
            catch (err) {
                this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
            }
        }
        return finalSettings;
    }
    async getEffectiveBranding(companyId, shopId, documentType) {
        const cacheKey = `branding:effective:${companyId}:${shopId}:${documentType}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (err) {
            this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
        }
        const [companyBranding, branchBranding, documentSettings, resolvedBranding] = await Promise.all([
            this.getCompanyBranding(companyId),
            this.getBranchBranding(shopId),
            this.getDocumentSettings(companyId, documentType),
            this.brandingResolver.resolveForShop(shopId),
        ]);
        const result = {
            companyName: companyBranding.companyName,
            gstNumber: companyBranding.address || branchBranding.taxId,
            address: branchBranding.address || companyBranding.address,
            phone: branchBranding.phone || companyBranding.phone,
            email: branchBranding.email || companyBranding.email,
            footerText: branchBranding.footerText || companyBranding.footerText,
            logoUrl: resolvedBranding.logoUrl,
            signatureUrl: resolvedBranding.signatureUrl,
            sealUrl: resolvedBranding.sealUrl,
            documentSettings,
        };
        try {
            await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
        }
        catch (err) {
            this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
        }
        return result;
    }
    async createBrandingSnapshot(companyId, shopId, documentType, companyData) {
        const [effective, _branchBranding, _company] = await Promise.all([
            this.getEffectiveBranding(companyId, shopId, documentType),
            this.getBranchBranding(shopId),
            this.prisma.company.findUnique({
                where: { id: companyId },
                select: {
                    companyName: true,
                    address: true,
                    brandingProfile: {
                        select: {
                            brandingVersion: true,
                        },
                    },
                },
            }),
        ]);
        const snapshotBase = {
            version: 1,
            generatedAt: new Date().toISOString(),
            documentType,
            company: {
                name: effective.companyName,
                legalName: companyData?.legalName,
                gstNumber: companyData?.gstNumber,
                panNumber: companyData?.panNumber,
                address: effective.address,
                phone: effective.phone,
                email: effective.email,
            },
            assets: {
                logoUrl: effective.logoUrl,
                signatureUrl: effective.signatureUrl,
                sealUrl: effective.sealUrl,
            },
            theme: {
                primaryColor: undefined,
                secondaryColor: undefined,
            },
            documentSettings: effective.documentSettings,
            footerText: effective.footerText,
        };
        this.validateSnapshot(snapshotBase);
        const checksum = this.generateChecksum(snapshotBase);
        const snapshot = {
            ...snapshotBase,
            checksum,
        };
        return snapshot;
    }
    validateSnapshot(snapshot) {
        if (snapshot.documentSettings.showLogo && !snapshot.assets.logoUrl) {
            throw new common_1.BadRequestException('Logo is enabled in document settings but logo URL is missing');
        }
        if (snapshot.documentSettings.showSignature && !snapshot.assets.signatureUrl) {
            throw new common_1.BadRequestException('Signature is enabled in document settings but signature URL is missing');
        }
        if (snapshot.documentSettings.showSeal && !snapshot.assets.sealUrl) {
            throw new common_1.BadRequestException('Seal is enabled in document settings but seal URL is missing');
        }
        if (snapshot.documentSettings.showGST && !snapshot.company.gstNumber) {
            throw new common_1.BadRequestException('GST is enabled in document settings but GST number is missing');
        }
    }
    generateChecksum(snapshot) {
        const orderedPayload = {
            version: snapshot.version,
            generatedAt: snapshot.generatedAt,
            documentType: snapshot.documentType,
            company: snapshot.company,
            assets: snapshot.assets,
            theme: snapshot.theme,
            documentSettings: snapshot.documentSettings,
            footerText: snapshot.footerText,
        };
        const content = JSON.stringify(orderedPayload);
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    validateChecksumIntegrity(snapshot) {
        const expectedChecksum = this.generateChecksum({
            version: snapshot.version,
            generatedAt: snapshot.generatedAt,
            documentType: snapshot.documentType,
            company: snapshot.company,
            assets: snapshot.assets,
            theme: snapshot.theme,
            documentSettings: snapshot.documentSettings,
            footerText: snapshot.footerText,
        });
        return expectedChecksum === snapshot.checksum;
    }
    async invalidateCompanyCache(companyId) {
        try {
            await this.redis.del(`branding:company:${companyId}`);
        }
        catch (err) {
            this.logger.warn(`Failed to invalidate company cache: ${err.message}`);
        }
    }
    async invalidateBranchCache(shopId) {
        if (!this.redis)
            return;
        try {
            await this.redis.del(`branding:branch:${shopId}`);
        }
        catch (err) {
            this.logger.warn(`Failed to invalidate branch cache: ${err.message}`);
        }
    }
    async invalidateDocumentSettingsCache(companyId, documentType) {
        try {
            if (documentType) {
                await this.redis.del(`branding:document:${companyId}:${documentType}`);
            }
            else {
                await this.scanAndDelete(`branding:document:${companyId}:*`);
            }
        }
        catch (err) {
            this.logger.warn(`Failed to invalidate document settings cache: ${err.message}`);
        }
    }
    async invalidateEffectiveCache(companyId, shopId) {
        try {
            if (shopId) {
                await this.scanAndDelete(`branding:effective:${companyId}:${shopId}:*`);
            }
            else {
                await this.scanAndDelete(`branding:effective:${companyId}:*`);
            }
        }
        catch (err) {
            this.logger.warn(`Failed to invalidate effective cache: ${err.message}`);
        }
    }
    async scanAndDelete(pattern) {
        let cursor = '0';
        const batchSize = 100;
        do {
            const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
            cursor = newCursor;
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } while (cursor !== '0');
    }
};
exports.BrandingService = BrandingService;
exports.BrandingService = BrandingService = BrandingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(redis_provider_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branding_resolver_service_1.BrandingResolverService,
        storage_service_1.StorageService,
        ioredis_1.default])
], BrandingService);
//# sourceMappingURL=branding.service.js.map
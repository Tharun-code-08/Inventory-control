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
exports.BrandingResolverService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const branding_utils_1 = require("./branding-utils");
let BrandingResolverService = class BrandingResolverService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    resolveField(overrides) {
        for (const value of overrides) {
            if (value !== null && value !== undefined && value !== '')
                return value;
        }
        return overrides[overrides.length - 1] ?? null;
    }
    async loadAsset(assetId) {
        if (!assetId)
            return null;
        return this.prisma.mediaAsset.findUnique({
            where: { id: assetId },
        });
    }
    async resolveAssets(assetIds) {
        const [logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset] = await Promise.all([
            this.loadAsset(assetIds.logoAssetId),
            this.loadAsset(assetIds.watermarkAssetId),
            this.loadAsset(assetIds.sealAssetId),
            this.loadAsset(assetIds.signatureAssetId),
            this.loadAsset(assetIds.letterheadAssetId),
        ]);
        return { logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset };
    }
    async resolveForShop(shopId, options) {
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: {
                shopName: true,
                address: true,
                taxId: true,
                email: true,
                mobile: true,
                company: {
                    select: {
                        companyName: true,
                        address: true,
                        brandingProfile: true,
                    },
                },
                brandingProfile: true,
            },
        });
        if (!shop?.company) {
            return {
                initials: 'NA',
                companyName: 'Company',
            };
        }
        const shopProfile = shop.brandingProfile;
        const companyProfile = shop.company.brandingProfile;
        const snapshot = options?.snapshot ?? null;
        const logoAssetId = this.resolveField([
            shopProfile?.logoAssetId,
            companyProfile?.logoAssetId,
        ]);
        const watermarkAssetId = this.resolveField([
            shopProfile?.watermarkAssetId,
            companyProfile?.watermarkAssetId,
        ]);
        const sealAssetId = this.resolveField([
            shopProfile?.sealAssetId,
            companyProfile?.sealAssetId,
        ]);
        const signatureAssetId = this.resolveField([
            shopProfile?.signatureAssetId,
            companyProfile?.signatureAssetId,
        ]);
        const letterheadAssetId = this.resolveField([
            shopProfile?.letterheadAssetId,
            companyProfile?.letterheadAssetId,
        ]);
        const { logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset } = await this.resolveAssets({
            logoAssetId,
            watermarkAssetId,
            sealAssetId,
            signatureAssetId,
            letterheadAssetId,
        });
        let logoUrl = null;
        let logoVersion = null;
        if (logoAsset) {
            logoVersion = snapshot?.logoVersion ?? logoAsset.version;
            logoUrl = this.storage.getPublicUrl(logoAsset.assetKey, { version: logoVersion });
        }
        const companyName = snapshot?.companyName ?? shop.company.companyName;
        const initials = (0, branding_utils_1.computeCompanyInitials)(companyName);
        const brandingVersion = snapshot?.brandingVersion ?? shopProfile?.brandingVersion ?? companyProfile?.brandingVersion ?? null;
        return {
            logoUrl,
            logoVersion,
            initials,
            companyName,
            address: this.resolveField([shop.address, shop.company.address]),
            taxId: shop.taxId ?? null,
            email: this.resolveField([shopProfile?.email, companyProfile?.email, shop.email]),
            phone: this.resolveField([shopProfile?.phone, companyProfile?.phone, shop.mobile]),
            website: this.resolveField([shopProfile?.website, companyProfile?.website]),
            footerText: this.resolveField([shopProfile?.footerText, companyProfile?.footerText]),
            watermarkUrl: watermarkAsset
                ? this.storage.getPublicUrl(watermarkAsset.assetKey, { version: watermarkAsset.version })
                : null,
            sealUrl: sealAsset ? this.storage.getPublicUrl(sealAsset.assetKey, { version: sealAsset.version }) : null,
            signatureUrl: signatureAsset
                ? this.storage.getPublicUrl(signatureAsset.assetKey, { version: signatureAsset.version })
                : null,
            letterheadUrl: letterheadAsset
                ? this.storage.getPublicUrl(letterheadAsset.assetKey, { version: letterheadAsset.version })
                : null,
            brandingVersion,
        };
    }
    async resolveForCompany(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                companyName: true,
                address: true,
                brandingProfile: true,
            },
        });
        if (!company) {
            return {
                initials: 'NA',
                companyName: 'Company',
            };
        }
        const profile = company.brandingProfile;
        const { logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset } = await this.resolveAssets({
            logoAssetId: profile?.logoAssetId,
            watermarkAssetId: profile?.watermarkAssetId,
            sealAssetId: profile?.sealAssetId,
            signatureAssetId: profile?.signatureAssetId,
            letterheadAssetId: profile?.letterheadAssetId,
        });
        const initials = (0, branding_utils_1.computeCompanyInitials)(company.companyName);
        const logoUrl = logoAsset ? this.storage.getPublicUrl(logoAsset.assetKey, { version: logoAsset.version }) : null;
        return {
            logoUrl,
            logoVersion: logoAsset?.version ?? null,
            initials,
            companyName: company.companyName,
            address: company.address,
            taxId: null,
            email: profile?.email ?? null,
            phone: profile?.phone ?? null,
            website: profile?.website ?? null,
            footerText: profile?.footerText ?? null,
            watermarkUrl: watermarkAsset
                ? this.storage.getPublicUrl(watermarkAsset.assetKey, { version: watermarkAsset.version })
                : null,
            sealUrl: sealAsset ? this.storage.getPublicUrl(sealAsset.assetKey, { version: sealAsset.version }) : null,
            signatureUrl: signatureAsset
                ? this.storage.getPublicUrl(signatureAsset.assetKey, { version: signatureAsset.version })
                : null,
            letterheadUrl: letterheadAsset
                ? this.storage.getPublicUrl(letterheadAsset.assetKey, { version: letterheadAsset.version })
                : null,
            brandingVersion: profile?.brandingVersion ?? null,
        };
    }
    buildHealth(profile) {
        const checks = [
            { label: 'Logo', ok: Boolean(profile.logoUrl) },
            { label: 'Address', ok: Boolean(profile.address) },
            { label: 'GST', ok: Boolean(profile.taxId) },
            { label: 'Company Email', ok: Boolean(profile.email) },
            { label: 'Footer', ok: Boolean(profile.footerText) },
        ];
        const total = checks.length;
        const passed = checks.filter((c) => c.ok).length;
        const score = Math.round((passed / total) * 100);
        const missing = checks.filter((c) => !c.ok).map((c) => c.label);
        return { score, missing };
    }
    async resolveLogoVersionForSnapshot(shopId, snapshot) {
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: {
                brandingProfileId: true,
                companyId: true,
            },
        });
        if (!shop)
            return null;
        const logo = await this.prisma.mediaAsset.findFirst({
            where: {
                type: client_1.MediaAssetType.LOGO,
                version: snapshot.logoVersion ?? undefined,
                OR: [
                    { shopId },
                    { companyId: shop.companyId ?? undefined },
                ],
            },
        });
        return logo?.version ?? null;
    }
};
exports.BrandingResolverService = BrandingResolverService;
exports.BrandingResolverService = BrandingResolverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, storage_service_1.StorageService])
], BrandingResolverService);
//# sourceMappingURL=branding-resolver.service.js.map
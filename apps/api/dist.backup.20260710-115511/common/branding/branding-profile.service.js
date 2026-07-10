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
exports.BrandingProfileService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../../modules/audit/audit.service");
const branding_events_service_1 = require("./branding-events.service");
const media_asset_storage_service_1 = require("./media-asset-storage.service");
const assert_company_id_1 = require("../utils/assert-company-id");
let BrandingProfileService = class BrandingProfileService {
    prisma;
    audit;
    events;
    storage;
    constructor(prisma, audit, events, storage) {
        this.prisma = prisma;
        this.audit = audit;
        this.events = events;
        this.storage = storage;
    }
    async getOrCreateCompanyProfile(companyId, userId, tx) {
        const client = tx ?? this.prisma;
        const company = await client.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        if (company.brandingProfileId) {
            const profile = await client.brandingProfile.findUnique({ where: { id: company.brandingProfileId } });
            if (!profile)
                throw new common_1.NotFoundException('Branding profile not found');
            return profile;
        }
        const profile = await client.brandingProfile.create({
            data: {
                createdById: userId,
                updatedById: userId,
            },
        });
        await client.company.update({
            where: { id: companyId },
            data: { brandingProfileId: profile.id },
        });
        return profile;
    }
    async getOrCreateShopProfile(shopId, userId, tx) {
        const client = tx ?? this.prisma;
        const shop = await client.shop.findUnique({ where: { id: shopId } });
        if (!shop)
            throw new common_1.NotFoundException('Shop not found');
        if (shop.brandingProfileId) {
            const profile = await client.brandingProfile.findUnique({ where: { id: shop.brandingProfileId } });
            if (!profile)
                throw new common_1.NotFoundException('Branding profile not found');
            return profile;
        }
        const profile = await client.brandingProfile.create({
            data: {
                createdById: userId,
                updatedById: userId,
            },
        });
        await client.shop.update({
            where: { id: shopId },
            data: { brandingProfileId: profile.id },
        });
        return profile;
    }
    async updateCompanyBranding(user, companyId, input, logo) {
        return this.prisma.$transaction(async (tx) => {
            const profile = await this.getOrCreateCompanyProfile(companyId, user.id, tx);
            const current = await tx.brandingProfile.findUnique({ where: { id: profile.id } });
            if (!current)
                throw new common_1.NotFoundException('Branding profile not found');
            let logoAssetId = current.logoAssetId;
            if (logo) {
                const stored = await this.storage.storeAsset({ file: logo, type: client_1.MediaAssetType.LOGO, scope: { companyId } });
                const nextVersion = await this.nextAssetVersion(tx, companyId, null, client_1.MediaAssetType.LOGO);
                const asset = await tx.mediaAsset.create({
                    data: {
                        companyId,
                        brandingProfileId: profile.id,
                        type: client_1.MediaAssetType.LOGO,
                        assetKey: stored.assetKey,
                        fileName: stored.fileName,
                        version: nextVersion,
                        metadata: stored.metadata,
                        uploadedById: user.id,
                        active: true,
                    },
                });
                await tx.mediaAsset.updateMany({
                    where: { companyId, type: client_1.MediaAssetType.LOGO, id: { not: asset.id } },
                    data: { active: false },
                });
                logoAssetId = asset.id;
            }
            else if (input.removeLogo) {
                logoAssetId = null;
            }
            const logoChanged = Boolean(logo) || input.removeLogo;
            const updateData = {
                companyName: input.companyName ?? undefined,
                gstNumber: input.gstNumber ?? undefined,
                address: input.address ?? undefined,
                footerText: input.footerText ?? undefined,
                email: input.email ?? undefined,
                phone: input.phone ?? undefined,
                website: input.website ?? undefined,
                primaryColor: input.primaryColor ?? undefined,
                secondaryColor: input.secondaryColor ?? undefined,
                accentColor: input.accentColor ?? undefined,
                ...(logoChanged
                    ? {
                        logoAsset: logoAssetId
                            ? { connect: { id: logoAssetId } }
                            : { disconnect: true },
                    }
                    : {}),
                brandingVersion: { increment: 1 },
                updatedById: user.id,
            };
            const updated = await tx.brandingProfile.update({
                where: { id: profile.id },
                data: updateData,
            });
            await this.audit.log({
                companyId,
                userId: user.id,
                action: client_1.AuditAction.UPDATE,
                entityType: 'branding_profile',
                entityId: updated.id,
                oldValues: current,
                newValues: updated,
            }, tx);
            if (logo || input.removeLogo) {
                this.events.emit('COMPANY_LOGO_UPDATED', { companyId, userId: user.id });
            }
            else {
                this.events.emit('COMPANY_BRANDING_UPDATED', { companyId, userId: user.id });
            }
            return updated;
        });
    }
    async updateShopBranding(user, shopId, input, logo) {
        return this.prisma.$transaction(async (tx) => {
            const profile = await this.getOrCreateShopProfile(shopId, user.id, tx);
            const current = await tx.brandingProfile.findUnique({ where: { id: profile.id } });
            if (!current)
                throw new common_1.NotFoundException('Branding profile not found');
            let logoAssetId = current.logoAssetId;
            if (logo) {
                const stored = await this.storage.storeAsset({ file: logo, type: client_1.MediaAssetType.LOGO, scope: { shopId } });
                const nextVersion = await this.nextAssetVersion(tx, null, shopId, client_1.MediaAssetType.LOGO);
                const asset = await tx.mediaAsset.create({
                    data: {
                        shopId,
                        brandingProfileId: profile.id,
                        type: client_1.MediaAssetType.LOGO,
                        assetKey: stored.assetKey,
                        fileName: stored.fileName,
                        version: nextVersion,
                        metadata: stored.metadata,
                        uploadedById: user.id,
                        active: true,
                    },
                });
                await tx.mediaAsset.updateMany({
                    where: { shopId, type: client_1.MediaAssetType.LOGO, id: { not: asset.id } },
                    data: { active: false },
                });
                logoAssetId = asset.id;
            }
            else if (input.removeLogo) {
                logoAssetId = null;
            }
            const logoChanged = Boolean(logo) || input.removeLogo;
            const updateData = {
                companyName: input.companyName ?? undefined,
                gstNumber: input.gstNumber ?? undefined,
                address: input.address ?? undefined,
                footerText: input.footerText ?? undefined,
                email: input.email ?? undefined,
                phone: input.phone ?? undefined,
                website: input.website ?? undefined,
                primaryColor: input.primaryColor ?? undefined,
                secondaryColor: input.secondaryColor ?? undefined,
                accentColor: input.accentColor ?? undefined,
                ...(logoChanged
                    ? {
                        logoAsset: logoAssetId
                            ? { connect: { id: logoAssetId } }
                            : { disconnect: true },
                    }
                    : {}),
                brandingVersion: { increment: 1 },
                updatedById: user.id,
            };
            const updated = await tx.brandingProfile.update({
                where: { id: profile.id },
                data: updateData,
            });
            await this.audit.log({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                action: client_1.AuditAction.UPDATE,
                entityType: 'branding_profile',
                entityId: updated.id,
                oldValues: current,
                newValues: updated,
            }, tx);
            this.events.emit('SHOP_BRANDING_UPDATED', { shopId, userId: user.id });
            return updated;
        });
    }
    async nextAssetVersion(tx, companyId, shopId, type) {
        const latest = await tx.mediaAsset.findFirst({
            where: {
                type,
                ...(companyId ? { companyId } : {}),
                ...(shopId ? { shopId } : {}),
            },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        return (latest?.version ?? 0) + 1;
    }
    async bumpBrandingVersionForCompany(companyId, user) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company?.brandingProfileId)
            return;
        await this.prisma.brandingProfile.update({
            where: { id: company.brandingProfileId },
            data: { brandingVersion: { increment: 1 }, updatedById: user.id },
        });
        this.events.emit('COMPANY_BRANDING_UPDATED', { companyId, userId: user.id });
    }
    async bumpBrandingVersionForShop(shopId, user) {
        const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop?.brandingProfileId)
            return;
        await this.prisma.brandingProfile.update({
            where: { id: shop.brandingProfileId },
            data: { brandingVersion: { increment: 1 }, updatedById: user.id },
        });
        this.events.emit('SHOP_BRANDING_UPDATED', { shopId, userId: user.id });
    }
};
exports.BrandingProfileService = BrandingProfileService;
exports.BrandingProfileService = BrandingProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        branding_events_service_1.BrandingEventsService,
        media_asset_storage_service_1.MediaAssetStorageService])
], BrandingProfileService);
//# sourceMappingURL=branding-profile.service.js.map
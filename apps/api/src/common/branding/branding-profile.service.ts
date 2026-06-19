import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, MediaAssetType, Prisma } from '@prisma/client';
import type { RequestUser } from '../types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../modules/audit/audit.service';
import { BrandingEventsService } from './branding-events.service';
import { MediaAssetStorageService } from './media-asset-storage.service';
import { assertCompanyId } from '../utils/assert-company-id';
import type { BrandingProfileFields } from './branding.types';

export type BrandingUpdateInput = BrandingProfileFields & {
  removeLogo?: boolean;
};

@Injectable()
export class BrandingProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: BrandingEventsService,
    private readonly storage: MediaAssetStorageService,
  ) {}

  private async getOrCreateCompanyProfile(companyId: string, userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const company = await client.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.brandingProfileId) {
      const profile = await client.brandingProfile.findUnique({ where: { id: company.brandingProfileId } });
      if (!profile) throw new NotFoundException('Branding profile not found');
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

  private async getOrCreateShopProfile(shopId: string, userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const shop = await client.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.brandingProfileId) {
      const profile = await client.brandingProfile.findUnique({ where: { id: shop.brandingProfileId } });
      if (!profile) throw new NotFoundException('Branding profile not found');
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

  async updateCompanyBranding(user: RequestUser, companyId: string, input: BrandingUpdateInput, logo?: Express.Multer.File) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await this.getOrCreateCompanyProfile(companyId, user.id, tx);
      const current = await tx.brandingProfile.findUnique({ where: { id: profile.id } });
      if (!current) throw new NotFoundException('Branding profile not found');

      let logoAssetId = current.logoAssetId;
      if (logo) {
        const stored = await this.storage.storeAsset({ file: logo, type: MediaAssetType.LOGO, scope: { companyId } });
        const nextVersion = await this.nextAssetVersion(tx, companyId, null, MediaAssetType.LOGO);
        const asset = await tx.mediaAsset.create({
          data: {
            companyId,
            brandingProfileId: profile.id,
            type: MediaAssetType.LOGO,
            assetKey: stored.assetKey,
            fileName: stored.fileName,
            version: nextVersion,
            metadata: stored.metadata,
            uploadedById: user.id,
            active: true,
          },
        });
        await tx.mediaAsset.updateMany({
          where: { companyId, type: MediaAssetType.LOGO, id: { not: asset.id } },
          data: { active: false },
        });
        logoAssetId = asset.id;
      } else if (input.removeLogo) {
        logoAssetId = null;
      }

      const logoChanged = Boolean(logo) || input.removeLogo;
      const updateData: Prisma.BrandingProfileUpdateInput = {
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

      await this.audit.log(
        {
          companyId,
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'branding_profile',
          entityId: updated.id,
          oldValues: current,
          newValues: updated,
        },
        tx,
      );

      if (logo || input.removeLogo) {
        this.events.emit('COMPANY_LOGO_UPDATED', { companyId, userId: user.id });
      } else {
        this.events.emit('COMPANY_BRANDING_UPDATED', { companyId, userId: user.id });
      }

      return updated;
    });
  }

  async updateShopBranding(user: RequestUser, shopId: string, input: BrandingUpdateInput, logo?: Express.Multer.File) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await this.getOrCreateShopProfile(shopId, user.id, tx);
      const current = await tx.brandingProfile.findUnique({ where: { id: profile.id } });
      if (!current) throw new NotFoundException('Branding profile not found');

      let logoAssetId = current.logoAssetId;
      if (logo) {
        const stored = await this.storage.storeAsset({ file: logo, type: MediaAssetType.LOGO, scope: { shopId } });
        const nextVersion = await this.nextAssetVersion(tx, null, shopId, MediaAssetType.LOGO);
        const asset = await tx.mediaAsset.create({
          data: {
            shopId,
            brandingProfileId: profile.id,
            type: MediaAssetType.LOGO,
            assetKey: stored.assetKey,
            fileName: stored.fileName,
            version: nextVersion,
            metadata: stored.metadata,
            uploadedById: user.id,
            active: true,
          },
        });
        await tx.mediaAsset.updateMany({
          where: { shopId, type: MediaAssetType.LOGO, id: { not: asset.id } },
          data: { active: false },
        });
        logoAssetId = asset.id;
      } else if (input.removeLogo) {
        logoAssetId = null;
      }

      const logoChanged = Boolean(logo) || input.removeLogo;
      const updateData: Prisma.BrandingProfileUpdateInput = {
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

      await this.audit.log(
        {
          companyId: assertCompanyId(user),
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'branding_profile',
          entityId: updated.id,
          oldValues: current,
          newValues: updated,
        },
        tx,
      );

      this.events.emit('SHOP_BRANDING_UPDATED', { shopId, userId: user.id });
      return updated;
    });
  }

  private async nextAssetVersion(
    tx: Prisma.TransactionClient,
    companyId: string | null,
    shopId: string | null,
    type: MediaAssetType,
  ): Promise<number> {
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

  async bumpBrandingVersionForCompany(companyId: string, user: RequestUser) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company?.brandingProfileId) return;
    await this.prisma.brandingProfile.update({
      where: { id: company.brandingProfileId },
      data: { brandingVersion: { increment: 1 }, updatedById: user.id },
    });
    this.events.emit('COMPANY_BRANDING_UPDATED', { companyId, userId: user.id });
  }

  async bumpBrandingVersionForShop(shopId: string, user: RequestUser) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop?.brandingProfileId) return;
    await this.prisma.brandingProfile.update({
      where: { id: shop.brandingProfileId },
      data: { brandingVersion: { increment: 1 }, updatedById: user.id },
    });
    this.events.emit('SHOP_BRANDING_UPDATED', { shopId, userId: user.id });
  }
}

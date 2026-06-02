import { Injectable } from '@nestjs/common';
import { MediaAssetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { computeCompanyInitials } from './branding-utils';
import type { BrandingSnapshot, ResolvedBrandingProfile } from './branding.types';

type BrandingProfileRow = {
  id: string;
  brandingVersion: number;
  logoAssetId?: string | null;
  watermarkAssetId?: string | null;
  sealAssetId?: string | null;
  signatureAssetId?: string | null;
  letterheadAssetId?: string | null;
  footerText?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

@Injectable()
export class BrandingResolverService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private resolveField<T>(overrides: Array<T | null | undefined>): T | null | undefined {
    for (const value of overrides) {
      if (value !== null && value !== undefined && value !== '') return value;
    }
    return overrides[overrides.length - 1] ?? null;
  }

  private async loadAsset(assetId: string | null | undefined) {
    if (!assetId) return null;
    return this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
  }

  private async resolveAssets(assetIds: {
    logoAssetId?: string | null;
    watermarkAssetId?: string | null;
    sealAssetId?: string | null;
    signatureAssetId?: string | null;
    letterheadAssetId?: string | null;
  }) {
    const [logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset] = await Promise.all([
      this.loadAsset(assetIds.logoAssetId),
      this.loadAsset(assetIds.watermarkAssetId),
      this.loadAsset(assetIds.sealAssetId),
      this.loadAsset(assetIds.signatureAssetId),
      this.loadAsset(assetIds.letterheadAssetId),
    ]);
    return { logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset };
  }

  async resolveForShop(
    shopId: string,
    options?: { snapshot?: BrandingSnapshot | null },
  ): Promise<ResolvedBrandingProfile> {
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

    const shopProfile = shop.brandingProfile as BrandingProfileRow | null;
    const companyProfile = shop.company.brandingProfile as BrandingProfileRow | null;
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

    let logoUrl: string | null = null;
    let logoVersion: number | null = null;
    if (logoAsset) {
      logoVersion = snapshot?.logoVersion ?? logoAsset.version;
      logoUrl = this.storage.getPublicUrl(logoAsset.assetKey, { version: logoVersion });
    }

    const companyName = snapshot?.companyName ?? shop.company.companyName;
    const initials = computeCompanyInitials(companyName);
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

  async resolveForCompany(companyId: string): Promise<ResolvedBrandingProfile> {
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

    const profile = company.brandingProfile as BrandingProfileRow | null;
    const { logoAsset, watermarkAsset, sealAsset, signatureAsset, letterheadAsset } = await this.resolveAssets({
      logoAssetId: profile?.logoAssetId,
      watermarkAssetId: profile?.watermarkAssetId,
      sealAssetId: profile?.sealAssetId,
      signatureAssetId: profile?.signatureAssetId,
      letterheadAssetId: profile?.letterheadAssetId,
    });

    const initials = computeCompanyInitials(company.companyName);
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

  buildHealth(profile: ResolvedBrandingProfile) {
    const checks: Array<{ label: string; ok: boolean }> = [
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

  async resolveLogoVersionForSnapshot(
    shopId: string,
    snapshot: BrandingSnapshot,
  ): Promise<number | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        brandingProfileId: true,
        companyId: true,
      },
    });
    if (!shop) return null;
    const logo = await this.prisma.mediaAsset.findFirst({
      where: {
        type: MediaAssetType.LOGO,
        version: snapshot.logoVersion ?? undefined,
        OR: [
          { shopId },
          { companyId: shop.companyId ?? undefined },
        ],
      },
    });
    return logo?.version ?? null;
  }
}

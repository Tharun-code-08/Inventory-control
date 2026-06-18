import type { MediaAssetType } from '@prisma/client';

export type BrandingProfileFields = {
  footerText?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type BrandingAssets = {
  logoAssetId?: string | null;
  watermarkAssetId?: string | null;
  sealAssetId?: string | null;
  signatureAssetId?: string | null;
  letterheadAssetId?: string | null;
};

export type ResolvedBrandingProfile = {
  logoUrl?: string | null;
  logoVersion?: number | null;
  initials: string;
  companyName: string;
  address?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  footerText?: string | null;
  watermarkUrl?: string | null;
  sealUrl?: string | null;
  signatureUrl?: string | null;
  letterheadUrl?: string | null;
  brandingVersion?: number | null;
};

export type DocumentSettings = {
  showLogo: boolean;
  showGST: boolean;
  showAddress: boolean;
  showFooter: boolean;
  showSignature: boolean;
  showSeal: boolean;
};

export type FullBrandingSnapshot = {
  version: number;
  company: {
    name: string;
    legalName?: string;
    gstNumber?: string;
    panNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  assets: {
    logoUrl?: string | null;
    signatureUrl?: string | null;
    sealUrl?: string | null;
  };
  theme: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
  };
  documentSettings: DocumentSettings;
  footerText?: string | null;
  generatedAt: string;
};

// Keep BrandingSnapshot for backward compatibility
export type BrandingSnapshot = {
  companyName: string;
  shopName: string;
  logoVersion?: number | null;
  brandingVersion?: number | null;
  templateVersion?: number | null;
  generatedAt: string;
};

export type MediaAssetPayload = {
  type: MediaAssetType;
  assetKey: string;
  fileName: string;
  version: number;
  metadata?: Record<string, string>;
};

import type { MediaAssetType, DocumentType } from '@prisma/client';

export type BrandingProfileFields = {
  companyName?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  footerText?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
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

/**
 * BrandingSnapshotV1 - Immutable historical snapshot for document generation.
 * Stored in document tables (invoices, purchase_orders, etc) to ensure
 * PDFs remain historically accurate even if company branding changes.
 *
 * version: 1 - For future schema migrations (v1, v2, etc)
 *
 * Contains ONLY branding data, not audit information:
 * - generatedAt: When this branding state was captured (for debugging)
 * - documentType: Which document type this branding is for
 * - company/assets/theme/settings: Complete branding state
 *
 * DOES NOT contain:
 * - generatedBy (who created the document) → belongs in document/audit tables
 * - userId or audit info → belongs in audit_log or document itself
 *
 * Separation of concerns:
 * - BrandingSnapshot: "What branding was used?"
 * - Document table: "Who created/approved/posted this document?"
 * - Audit log: "What changed and when?"
 *
 * Future evolution:
 * If you introduce BrandingSnapshotV2 (e.g., adding watermark, QR code),
 * add brandingSnapshotVersion INT to document tables to track which
 * version was used. This enables historical PDF regeneration for all versions.
 *
 * Example:
 * ```
 * invoices {
 *   branding_snapshot JSONB (v1, v2, v3)
 *   branding_snapshot_version INT (1, 2, 3)
 * }
 * ```
 */
export type BrandingSnapshotV1 = {
  version: 1;
  checksum: string; // SHA256 of snapshot content (for corruption detection)
  generatedAt: string; // ISO 8601 - when branding was captured
  documentType: DocumentType;
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
};

/**
 * BrandingSnapshot (legacy format) - Used by existing PDF generation services.
 * @deprecated Use BrandingSnapshotV1 instead
 *
 * TODO: Remove after Phase 2 PDF integration is complete.
 * This type exists only for backward compatibility with the legacy
 * branding-resolver.service.ts and document-pdf.service.ts implementations.
 * Once those services are refactored to use BrandingSnapshotV1 and
 * createBrandingSnapshot(), this type can be safely deleted.
 */
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

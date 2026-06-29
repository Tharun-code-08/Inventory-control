import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingResolverService } from './branding-resolver.service';
import { StorageService } from '../storage/storage.service';
import { REDIS_CLIENT } from '../cache/redis.provider';
import type { DocumentSettings, BrandingSnapshotV1 } from './branding.types';

export interface EffectiveBrandingConfig {
  companyName: string;
  gstNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  sealUrl?: string | null;
  footerText?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  documentSettings: DocumentSettings;
}

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);

  // Default document settings if not configured
  private readonly DEFAULT_DOCUMENT_SETTINGS: Record<DocumentType, DocumentSettings> = {
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingResolver: BrandingResolverService,
    private readonly storage: StorageService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Get company branding configuration
   */
  async getCompanyBranding(companyId: string) {
    const cacheKey = `branding:company:${companyId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
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

    if (!company) throw new BadRequestException('Company not found');

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
    } catch (err) {
      this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
    }

    return result;
  }

  /**
   * Get shop/branch branding configuration (optional override)
   */
  async getBranchBranding(shopId: string) {
    const cacheKey = `branding:branch:${shopId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
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

    if (!shop) throw new BadRequestException('Shop not found');

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
    } catch (err) {
      this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
    }

    return result;
  }

  /**
   * Get document-specific branding settings
   */
  async getDocumentSettings(companyId: string, documentType: DocumentType): Promise<DocumentSettings> {
    const cacheKey = `branding:document:${companyId}:${documentType}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
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

    const settings = docBranding?.settings as DocumentSettings | undefined;
    const finalSettings: DocumentSettings = settings || this.DEFAULT_DOCUMENT_SETTINGS[documentType];

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(finalSettings));
      } catch (err) {
        this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
      }
    }

    return finalSettings;
  }

  /**
   * Get effective branding by combining company + branch + document settings
   */
  async getEffectiveBranding(
    companyId: string,
    shopId: string,
    documentType: DocumentType,
  ): Promise<EffectiveBrandingConfig> {
    const cacheKey = `branding:effective:${companyId}:${shopId}:${documentType}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
    }

    const [companyBranding, branchBranding, documentSettings, resolvedBranding] = await Promise.all([
      this.getCompanyBranding(companyId),
      this.getBranchBranding(shopId),
      this.getDocumentSettings(companyId, documentType),
      this.brandingResolver.resolveForShop(shopId),
    ]);

    const result: EffectiveBrandingConfig = {
      companyName: companyBranding.companyName,
      gstNumber: companyBranding.address || branchBranding.taxId, // fallback to branch taxId if no company address
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
    } catch (err) {
      this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
    }

    return result;
  }

  /**
   * Create a branding snapshot for historical accuracy.
   * Snapshots are immutable and stored in documents to ensure
   * PDFs remain historically accurate if company branding changes.
   *
   * Captures ONLY branding state, not audit information.
   * Audit (who created/modified) belongs in document/audit tables.
   */
  async createBrandingSnapshot(
    companyId: string,
    shopId: string,
    documentType: DocumentType,
    companyData?: {
      legalName?: string;
      gstNumber?: string;
      panNumber?: string;
    },
  ): Promise<BrandingSnapshotV1> {
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

    const snapshotBase: Omit<BrandingSnapshotV1, 'checksum'> = {
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

    // Validate snapshot before returning
    this.validateSnapshot(snapshotBase as BrandingSnapshotV1);

    // Generate checksum (detects corruption/tampering)
    const checksum = this.generateChecksum(snapshotBase);

    const snapshot: BrandingSnapshotV1 = {
      ...snapshotBase,
      checksum,
    };

    return snapshot;
  }

  /**
   * Validate snapshot before persistence.
   * Ensures that if a document setting is enabled, the required asset exists.
   */
  private validateSnapshot(snapshot: BrandingSnapshotV1): void {
    if (snapshot.documentSettings.showLogo && !snapshot.assets.logoUrl) {
      throw new BadRequestException('Logo is enabled in document settings but logo URL is missing');
    }

    if (snapshot.documentSettings.showSignature && !snapshot.assets.signatureUrl) {
      throw new BadRequestException('Signature is enabled in document settings but signature URL is missing');
    }

    if (snapshot.documentSettings.showSeal && !snapshot.assets.sealUrl) {
      throw new BadRequestException('Seal is enabled in document settings but seal URL is missing');
    }

    if (snapshot.documentSettings.showGST && !snapshot.company.gstNumber) {
      throw new BadRequestException('GST is enabled in document settings but GST number is missing');
    }
  }

  /**
   * Generate SHA256 checksum of snapshot content.
   * Used to detect corruption or tampering with snapshot JSONB.
   * Uses explicit field ordering for stable serialization (field order doesn't change checksum).
   */
  private generateChecksum(snapshot: Omit<BrandingSnapshotV1, 'checksum'>): string {
    // Explicit field order ensures checksum is stable across refactoring
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
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify snapshot integrity via checksum.
   * Detects DB corruption, manual JSONB edits, or migration errors.
   */
  validateChecksumIntegrity(snapshot: BrandingSnapshotV1): boolean {
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

  /**
   * Invalidate all branding caches for a company
   */
  async invalidateCompanyCache(companyId: string) {
    try {
      await this.redis.del(`branding:company:${companyId}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate company cache: ${err.message}`);
    }
  }

  /**
   * Invalidate all branding caches for a shop/branch
   */
  async invalidateBranchCache(shopId: string) {
    if (!this.redis) return;
    try {
      await this.redis.del(`branding:branch:${shopId}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate branch cache: ${err.message}`);
    }
  }

  /**
   * Invalidate document settings cache
   */
  async invalidateDocumentSettingsCache(companyId: string, documentType?: DocumentType) {
    try {
      if (documentType) {
        await this.redis.del(`branding:document:${companyId}:${documentType}`);
      } else {
        // Invalidate all document settings for this company using SCAN
        await this.scanAndDelete(`branding:document:${companyId}:*`);
      }
    } catch (err) {
      this.logger.warn(`Failed to invalidate document settings cache: ${err.message}`);
    }
  }

  /**
   * Invalidate effective branding cache
   */
  async invalidateEffectiveCache(companyId: string, shopId?: string) {
    try {
      if (shopId) {
        await this.scanAndDelete(`branding:effective:${companyId}:${shopId}:*`);
      } else {
        await this.scanAndDelete(`branding:effective:${companyId}:*`);
      }
    } catch (err) {
      this.logger.warn(`Failed to invalidate effective cache: ${err.message}`);
    }
  }

  /**
   * Helper: Use SCAN to iterate and delete keys (non-blocking)
   */
  private async scanAndDelete(pattern: string): Promise<void> {
    let cursor = '0';
    const batchSize = 100;

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        batchSize,
      );
      cursor = newCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}

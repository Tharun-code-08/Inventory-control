import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingResolverService } from './branding-resolver.service';
import { StorageService } from '../storage/storage.service';
import type { DocumentSettings, FullBrandingSnapshot } from './branding.types';

export type DocumentType =
  | 'INVOICE'
  | 'PURCHASE_ORDER'
  | 'QUOTATION'
  | 'GOODS_ISSUE'
  | 'GOODS_RECEIPT'
  | 'EWAY_BILL'
  | 'DELIVERY_CHALLAN'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'REPORT';

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
  private redis: Redis | null = null;

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
    private readonly config: ConfigService,
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      this.redis = new Redis({
        host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
        port: Number(this.config.get<string>('REDIS_PORT', '6379')),
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: null,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });
    } catch (err) {
      this.logger.warn(`Failed to initialize Redis: ${err.message}`);
      this.redis = null;
    }
  }

  /**
   * Get company branding configuration
   */
  async getCompanyBranding(companyId: string) {
    const cacheKey = `branding:company:${companyId}`;

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
      }
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

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      } catch (err) {
        this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Get shop/branch branding configuration (optional override)
   */
  async getBranchBranding(shopId: string) {
    const cacheKey = `branding:branch:${shopId}`;

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
      }
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

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      } catch (err) {
        this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Get document-specific branding settings
   */
  async getDocumentSettings(companyId: string, documentType: DocumentType): Promise<DocumentSettings> {
    const cacheKey = `branding:document:${companyId}:${documentType}`;

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
      }
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

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        this.logger.warn(`Redis get failed for ${cacheKey}: ${err.message}`);
      }
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

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      } catch (err) {
        this.logger.warn(`Redis set failed for ${cacheKey}: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Create a branding snapshot for historical accuracy
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
  ): Promise<FullBrandingSnapshot> {
    const [effective, branchBranding, company] = await Promise.all([
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

    const snapshot: FullBrandingSnapshot = {
      version: 1,
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
      generatedAt: new Date().toISOString(),
    };

    return snapshot;
  }

  /**
   * Invalidate all branding caches for a company
   */
  async invalidateCompanyCache(companyId: string) {
    if (!this.redis) return;
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
    if (!this.redis) return;
    try {
      if (documentType) {
        await this.redis.del(`branding:document:${companyId}:${documentType}`);
      } else {
        // Invalidate all document settings for this company (using pattern)
        const keys = await this.redis.keys(`branding:document:${companyId}:*`);
        if (keys.length > 0) await this.redis.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Failed to invalidate document settings cache: ${err.message}`);
    }
  }

  /**
   * Invalidate effective branding cache
   */
  async invalidateEffectiveCache(companyId: string, shopId?: string) {
    if (!this.redis) return;
    try {
      if (shopId) {
        const keys = await this.redis.keys(`branding:effective:${companyId}:${shopId}:*`);
        if (keys.length > 0) await this.redis.del(...keys);
      } else {
        const keys = await this.redis.keys(`branding:effective:${companyId}:*`);
        if (keys.length > 0) await this.redis.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Failed to invalidate effective cache: ${err.message}`);
    }
  }
}

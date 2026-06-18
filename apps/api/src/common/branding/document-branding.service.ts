import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from './branding.service';
import type { DocumentType } from './branding.service';
import type { DocumentSettings } from './branding.types';

@Injectable()
export class DocumentBrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  /**
   * Get document branding settings
   */
  async getSettings(companyId: string, documentType: DocumentType) {
    const settings = await this.prisma.documentBranding.findUnique({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        },
      },
    });

    return settings?.settings || this.getDefaultSettings(documentType);
  }

  /**
   * Update document branding settings
   */
  async updateSettings(
    companyId: string,
    documentType: DocumentType,
    settings: DocumentSettings,
    userId: string,
  ) {
    const result = await this.prisma.documentBranding.upsert({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        },
      },
      create: {
        companyId,
        documentType,
        settings,
        createdById: userId,
        updatedById: userId,
      },
      update: {
        settings,
        updatedById: userId,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.brandingService.invalidateDocumentSettingsCache(companyId, documentType);
    await this.brandingService.invalidateEffectiveCache(companyId);

    return result;
  }

  /**
   * Get settings for all document types for a company
   */
  async getAllSettings(companyId: string) {
    return this.prisma.documentBranding.findMany({
      where: { companyId },
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(companyId: string, documentType: DocumentType, userId: string) {
    await this.prisma.documentBranding.delete({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        },
      },
    });

    // Invalidate cache
    await this.brandingService.invalidateDocumentSettingsCache(companyId, documentType);
    await this.brandingService.invalidateEffectiveCache(companyId);

    return this.getDefaultSettings(documentType);
  }

  private getDefaultSettings(documentType: DocumentType): DocumentSettings {
    const defaults: Record<DocumentType, DocumentSettings> = {
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

    return defaults[documentType];
  }
}

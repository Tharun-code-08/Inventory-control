import Redis from 'ioredis';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingResolverService } from './branding-resolver.service';
import { StorageService } from '../storage/storage.service';
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
export declare class BrandingService {
    private readonly prisma;
    private readonly brandingResolver;
    private readonly storage;
    private readonly redis;
    private readonly logger;
    private readonly DEFAULT_DOCUMENT_SETTINGS;
    constructor(prisma: PrismaService, brandingResolver: BrandingResolverService, storage: StorageService, redis: Redis);
    getCompanyBranding(companyId: string): Promise<any>;
    getBranchBranding(shopId: string): Promise<any>;
    getDocumentSettings(companyId: string, documentType: DocumentType): Promise<DocumentSettings>;
    getEffectiveBranding(companyId: string, shopId: string, documentType: DocumentType): Promise<EffectiveBrandingConfig>;
    createBrandingSnapshot(companyId: string, shopId: string, documentType: DocumentType, companyData?: {
        legalName?: string;
        gstNumber?: string;
        panNumber?: string;
    }): Promise<BrandingSnapshotV1>;
    private validateSnapshot;
    private generateChecksum;
    validateChecksumIntegrity(snapshot: BrandingSnapshotV1): boolean;
    invalidateCompanyCache(companyId: string): Promise<void>;
    invalidateBranchCache(shopId: string): Promise<void>;
    invalidateDocumentSettingsCache(companyId: string, documentType?: DocumentType): Promise<void>;
    invalidateEffectiveCache(companyId: string, shopId?: string): Promise<void>;
    private scanAndDelete;
}

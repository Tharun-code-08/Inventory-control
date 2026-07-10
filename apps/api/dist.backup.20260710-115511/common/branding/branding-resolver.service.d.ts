import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { BrandingSnapshot, ResolvedBrandingProfile } from './branding.types';
export declare class BrandingResolverService {
    private readonly prisma;
    private readonly storage;
    constructor(prisma: PrismaService, storage: StorageService);
    private resolveField;
    private loadAsset;
    private resolveAssets;
    resolveForShop(shopId: string, options?: {
        snapshot?: BrandingSnapshot | null;
    }): Promise<ResolvedBrandingProfile>;
    resolveForCompany(companyId: string): Promise<ResolvedBrandingProfile>;
    buildHealth(profile: ResolvedBrandingProfile): {
        score: number;
        missing: string[];
    };
    resolveLogoVersionForSnapshot(shopId: string, snapshot: BrandingSnapshot): Promise<number | null>;
}

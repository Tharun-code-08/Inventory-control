import { DocumentSeriesRestart, Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import type { DocumentSeriesRowDto } from './dto/update-document-series.dto';
export type ResolvedDocumentSeriesConfig = {
    docType: string;
    moduleLabel: string;
    prefix: string;
    startingNumber: number;
    padWidth: number;
    restartPeriod: DocumentSeriesRestart;
    shopScoped: boolean;
    enabled: boolean;
    useCategoryPrefix: boolean;
    isOverride: boolean;
};
export type DocumentSeriesListRow = ResolvedDocumentSeriesConfig & {
    preview: string;
    currentSequence: number | null;
    sequenceBucket: string;
};
export declare class DocumentSeriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private assertOrgAdmin;
    private requireCompanyId;
    sequenceBucket(date: Date, restartPeriod: DocumentSeriesRestart): string;
    sanitizePrefix(prefix: string): string;
    shopScopedPrefix(shopNumber: string, basePrefix: string): string;
    buildPreview(config: ResolvedDocumentSeriesConfig, shopNumber?: string, date?: Date): string;
    private toResolved;
    ensureCompanyDefaults(companyId: string, userId?: string): Promise<void>;
    resolveEffectiveConfig(companyId: string, shopId: string, docType: string): Promise<ResolvedDocumentSeriesConfig>;
    resolveEffectiveConfigInTx(tx: Prisma.TransactionClient, companyId: string, shopId: string, docType: string): Promise<ResolvedDocumentSeriesConfig>;
    private resolvePreviewShop;
    private currentSequenceFor;
    listEffective(user: RequestUser, shopId?: string | null): Promise<DocumentSeriesListRow[]>;
    private normalizeRowInput;
    private upsertCompanyRow;
    updateCompanyDefaults(user: RequestUser, rows: DocumentSeriesRowDto[]): Promise<DocumentSeriesListRow[]>;
    updateShopOverrides(user: RequestUser, shopId: string, rows: DocumentSeriesRowDto[]): Promise<DocumentSeriesListRow[]>;
    deleteShopOverride(user: RequestUser, shopId: string, docType: string): Promise<DocumentSeriesListRow[]>;
}

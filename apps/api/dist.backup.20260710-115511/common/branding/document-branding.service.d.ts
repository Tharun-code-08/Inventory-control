import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from './branding.service';
import type { DocumentSettings } from './branding.types';
export declare class DocumentBrandingService {
    private readonly prisma;
    private readonly brandingService;
    constructor(prisma: PrismaService, brandingService: BrandingService);
    getSettings(companyId: string, documentType: DocumentType): Promise<string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | DocumentSettings>;
    updateSettings(companyId: string, documentType: DocumentType, settings: DocumentSettings, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        companyId: string;
        documentType: import(".prisma/client").$Enums.DocumentType;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getAllSettings(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        companyId: string;
        documentType: import(".prisma/client").$Enums.DocumentType;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    resetSettings(companyId: string, documentType: DocumentType, _userId: string): Promise<DocumentSettings>;
    private getDefaultSettings;
}

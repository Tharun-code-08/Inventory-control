import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
export declare class CompanySettingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        value: string;
        key: string;
    }[]>;
    get(user: RequestUser, key: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        value: string;
        key: string;
    }>;
    upsert(user: RequestUser, key: string, value: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        value: string;
        key: string;
    }>;
    getSetting(companyId: string, key: string): Promise<string | null>;
    getUnknownBarcodePolicy(companyId: string): Promise<'AUTO_CREATE' | 'ASK' | 'REJECT'>;
}

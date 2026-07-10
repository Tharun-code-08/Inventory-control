import type { PrismaService } from '../../../prisma/prisma.service';
export type ShopCompanyContext = {
    companyId: string;
    companyName: string;
    companyLines: string[];
    shopName: string;
    shopLines: string[];
    shopEmail?: string | null;
    shopGstin?: string | null;
};
export declare function loadShopCompanyContext(prisma: PrismaService, shopId: string): Promise<ShopCompanyContext>;
export declare function buildCompanyPartyLines(args: {
    address?: string | null;
    gstin?: string | null;
    email?: string | null;
}): string[];
export declare function customerPartyLines(customer: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    pan?: string | null;
}): string[];
export declare function supplierPartyLines(supplier: {
    contactPerson?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    vatNumber?: string | null;
}): string[];

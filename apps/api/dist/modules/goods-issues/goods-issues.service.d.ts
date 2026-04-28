import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
type Line = {
    productId: string;
    quantity: number;
    uom: string;
};
export declare class GoodsIssuesService {
    private readonly prisma;
    private readonly stock;
    private readonly numbers;
    constructor(prisma: PrismaService, stock: StockService, numbers: DocumentNumberService);
    private assertNotFuture;
    private available;
    list(user: RequestUser, query: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
        status?: DocumentStatus;
        cursor?: string;
        take?: number;
    }): Promise<{
        data: ({
            shop: {
                email: string;
                shopName: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                shopNumber: string;
                taxId: string | null;
                address: string;
                contactPerson: string;
                mobile: string;
                companyId: string | null;
            };
        } & {
            shopId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.DocumentStatus;
            remarks: string | null;
            postedAt: Date | null;
            giDate: Date;
            issueReason: string;
            giNumber: string;
        })[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, params: {
        giDate: string;
        shopId: string;
        issueReason: string;
        remarks?: string;
        items: Line[];
    }): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: ({
            product: {
                shopId: string;
                description: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productCode: string;
                uom: string;
                category: string;
                purchasePrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                minStockLevel: Prisma.Decimal;
                openingStock: Prisma.Decimal;
                reorderQty: Prisma.Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            availableStockSnapshot: Prisma.Decimal;
            giHeaderId: string;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        postedAt: Date | null;
        giDate: Date;
        issueReason: string;
        giNumber: string;
    }>;
    get(user: RequestUser, id: string): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: ({
            product: {
                shopId: string;
                description: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productCode: string;
                uom: string;
                category: string;
                purchasePrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                minStockLevel: Prisma.Decimal;
                openingStock: Prisma.Decimal;
                reorderQty: Prisma.Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            availableStockSnapshot: Prisma.Decimal;
            giHeaderId: string;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        postedAt: Date | null;
        giDate: Date;
        issueReason: string;
        giNumber: string;
    }>;
    update(user: RequestUser, id: string, dto: Partial<{
        giDate: string;
        shopId: string;
        issueReason: string;
        remarks?: string;
        items: Line[];
    }>): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: ({
            product: {
                shopId: string;
                description: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productCode: string;
                uom: string;
                category: string;
                purchasePrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                minStockLevel: Prisma.Decimal;
                openingStock: Prisma.Decimal;
                reorderQty: Prisma.Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            availableStockSnapshot: Prisma.Decimal;
            giHeaderId: string;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        postedAt: Date | null;
        giDate: Date;
        issueReason: string;
        giNumber: string;
    }>;
    post(user: RequestUser, id: string): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: ({
            product: {
                shopId: string;
                description: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productCode: string;
                uom: string;
                category: string;
                purchasePrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                minStockLevel: Prisma.Decimal;
                openingStock: Prisma.Decimal;
                reorderQty: Prisma.Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            availableStockSnapshot: Prisma.Decimal;
            giHeaderId: string;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        postedAt: Date | null;
        giDate: Date;
        issueReason: string;
        giNumber: string;
    }>;
    print(user: RequestUser, id: string): Promise<string>;
    remove(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
}
export {};

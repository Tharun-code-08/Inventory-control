import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private resolveDateRange;
    private shop;
    inventory(user: RequestUser, filters: {
        shop_id?: string;
        category?: string;
        low_stock_only?: boolean;
    }): Promise<{
        product_id: string;
        product_code: string;
        description: string;
        shop_id: string;
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
    }[]>;
    lowStock(user: RequestUser, shop_id?: string): Promise<{
        product_id: string;
        product_code: string;
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
    }[]>;
    fastMoving(user: RequestUser, filters: {
        shop_id: string;
        date_from: string;
        date_to: string;
        limit?: number;
    }): Promise<{
        product_code: string;
        description: string;
        total_issued_qty: Prisma.Decimal;
        velocity: Prisma.Decimal;
        is_top_velocity_decile: boolean;
    }[]>;
    damagedRegister(user: RequestUser, shop_id?: string): Promise<({
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
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        productId: string;
        postedAt: Date | null;
        damageDate: Date;
        damagedQuantity: Prisma.Decimal;
        reason: string;
        damageNumber: string;
    })[]>;
    grRegister(user: RequestUser, date_from?: string, date_to?: string, shop_id?: string): Promise<({
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
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            purchaseRate: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            grHeaderId: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        grDate: Date;
        purchaseOrderId: string | null;
        supplierName: string;
        supplierRef: string | null;
        grNumber: string;
        postedAt: Date | null;
        totalValue: Prisma.Decimal | null;
    })[]>;
    giRegister(user: RequestUser, date_from?: string, date_to?: string, shop_id?: string): Promise<({
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
        items: {
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
        }[];
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
    })[]>;
    stockLedger(user: RequestUser, product_id?: string, date_from?: string, date_to?: string, shop_id?: string): Promise<{
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        value: Prisma.Decimal | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        transactionRef: string;
        transactionDate: Date;
        inQty: Prisma.Decimal;
        outQty: Prisma.Decimal;
        balanceQty: Prisma.Decimal;
        unitRate: Prisma.Decimal | null;
        remarks: string | null;
        productId: string;
    }[]>;
    shopSummary(user: RequestUser, shop_id?: string): Promise<{
        shop_id: string;
        shop_name: string;
        sku_count: number;
        stock_value: number;
    }[]>;
}

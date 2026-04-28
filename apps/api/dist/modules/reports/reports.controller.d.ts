import { Queue } from 'bullmq';
import type { RequestUser } from '../../common/types/request-user';
import { ExportReportDto } from './dto/export-report.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reports;
    private readonly exportsQueue;
    constructor(reports: ReportsService, exportsQueue: Queue);
    inventory(user: RequestUser, shopId?: string, category?: string, low?: string): Promise<{
        product_id: string;
        product_code: string;
        description: string;
        shop_id: string;
        current_stock: import("@prisma/client/runtime/library").Decimal;
        min_stock_level: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    lowStock(user: RequestUser, shopId?: string): Promise<{
        product_id: string;
        product_code: string;
        current_stock: import("@prisma/client/runtime/library").Decimal;
        min_stock_level: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    fastMoving(user: RequestUser, shopId: string, dateFrom: string, dateTo: string, limit?: string): Promise<{
        product_code: string;
        description: string;
        total_issued_qty: import("@prisma/client/runtime/library").Decimal;
        velocity: import("@prisma/client/runtime/library").Decimal;
        is_top_velocity_decile: boolean;
    }[]>;
    damaged(user: RequestUser, shopId?: string): Promise<({
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
            purchasePrice: import("@prisma/client/runtime/library").Decimal;
            sellingPrice: import("@prisma/client/runtime/library").Decimal;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            openingStock: import("@prisma/client/runtime/library").Decimal;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
        damagedQuantity: import("@prisma/client/runtime/library").Decimal;
        reason: string;
        damageNumber: string;
    })[]>;
    gr(user: RequestUser, dateFrom: string, dateTo: string, shopId?: string): Promise<({
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            purchaseRate: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    gi(user: RequestUser, dateFrom: string, dateTo: string, shopId?: string): Promise<({
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            availableStockSnapshot: import("@prisma/client/runtime/library").Decimal;
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
    ledger(user: RequestUser, productId?: string, dateFrom?: string, dateTo?: string, shopId?: string): Promise<{
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        value: import("@prisma/client/runtime/library").Decimal | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        transactionRef: string;
        transactionDate: Date;
        inQty: import("@prisma/client/runtime/library").Decimal;
        outQty: import("@prisma/client/runtime/library").Decimal;
        balanceQty: import("@prisma/client/runtime/library").Decimal;
        unitRate: import("@prisma/client/runtime/library").Decimal | null;
        remarks: string | null;
        productId: string;
    }[]>;
    shopSummary(user: RequestUser, shopId?: string): Promise<{
        shop_id: string;
        shop_name: string;
        sku_count: number;
        stock_value: number;
    }[]>;
    export(body: ExportReportDto): Promise<{
        jobId: string | undefined;
    }>;
}

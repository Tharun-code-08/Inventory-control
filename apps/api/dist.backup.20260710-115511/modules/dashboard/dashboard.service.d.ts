import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
export type DashboardSummaryPayload = {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    lowStockCriticalCount: number;
    lowStockWarningCount: number;
    recentTransactions: number;
    monthlyMovement: {
        month: string;
        receipts: number;
        issues: number;
    }[];
    categoryBreakdown: {
        category: string;
        count: number;
    }[];
    recentGoodsReceipts: Array<{
        id: string;
        grNumber: string;
        grDate: string;
        supplier: string;
        totalValue: number;
        status: string;
    }>;
    recentGoodsIssues: Array<{
        id: string;
        giNumber: string;
        giDate: string;
        issueReason: string;
        status: string;
    }>;
    lowStockProducts: Array<{
        id: string;
        shopId: string;
        productCode: string;
        description: string;
        category: string;
        currentStock: number;
        minStockLevel: number;
    }>;
    topProducts: Array<{
        id: string;
        productCode: string;
        description: string;
        category: string;
        currentStock: number;
        unitCost: number;
        stockValue: number;
    }>;
    kpiContext: {
        productsAddedThisMonth: number;
        stockValueAvgPerProduct: number;
        transactionsPriorPeriod: number;
        pendingPurchaseOrders: number;
        pendingSalesOrders: number;
        totalWarehouses: number;
        pendingGoodsReceipts: number;
        pendingRFQ: number;
        pendingQuotations: number;
    };
};
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    summary(user: RequestUser, shop_id?: string): Promise<DashboardSummaryPayload>;
    executive(user: RequestUser, shop_id?: string): Promise<{
        financial: {
            revenueToday: number;
            revenueThisMonth: number;
            netProfitMonth: number;
            cashAvailable: number;
        };
        inventory: {
            inventoryValue: number;
            lowStockCount: number;
            deadStockValue: number;
            coverageDays: number;
        };
        attention: {
            id: string;
            severity: string;
            title: string;
            action: string;
        }[];
        recommendations: never[];
    }>;
    private fetchFinancialCard;
    private fetchInventoryCard;
    private fetchAttentionCard;
    private resolveDashboardShopIds;
    private aggregateStockValueAndLowCount;
    private fetchTopProducts;
    private fetchLowStockProducts;
    private fetchMonthlyMovement;
    private formatMonthlyMovement;
}

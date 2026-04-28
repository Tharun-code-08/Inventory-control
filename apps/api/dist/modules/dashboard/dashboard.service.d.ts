import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
export type DashboardSummaryPayload = {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
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
        productCode: string;
        description: string;
        currentStock: number;
        minStockLevel: number;
    }>;
};
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    summary(user: RequestUser, shop_id?: string): Promise<DashboardSummaryPayload>;
}

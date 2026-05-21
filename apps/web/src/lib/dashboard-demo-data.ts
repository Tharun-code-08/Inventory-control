export type DashboardViewData = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  recentTransactions: number;
  monthlyMovement: { month: string; receipts: number; issues: number }[];
  categoryBreakdown: { category: string; count: number }[];
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
};

export const EMPTY_DASHBOARD: DashboardViewData = {
  totalProducts: 0,
  totalStockValue: 0,
  lowStockCount: 0,
  recentTransactions: 0,
  monthlyMovement: [],
  categoryBreakdown: [],
  recentGoodsReceipts: [],
  recentGoodsIssues: [],
  lowStockProducts: [],
};

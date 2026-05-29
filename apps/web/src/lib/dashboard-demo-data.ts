export type DashboardViewData = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  lowStockCriticalCount: number;
  lowStockWarningCount: number;
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
  };
};

export const EMPTY_DASHBOARD: DashboardViewData = {
  totalProducts: 0,
  totalStockValue: 0,
  lowStockCount: 0,
  lowStockCriticalCount: 0,
  lowStockWarningCount: 0,
  recentTransactions: 0,
  kpiContext: {
    productsAddedThisMonth: 0,
    stockValueAvgPerProduct: 0,
    transactionsPriorPeriod: 0,
    pendingPurchaseOrders: 0,
    pendingSalesOrders: 0,
  },
  monthlyMovement: [],
  categoryBreakdown: [],
  recentGoodsReceipts: [],
  recentGoodsIssues: [],
  lowStockProducts: [],
  topProducts: [],
};

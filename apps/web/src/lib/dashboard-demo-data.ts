export type DashboardViewData = {
  isDemo?: boolean;
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
    productCode: string;
    description: string;
    currentStock: number;
    minStockLevel: number;
  }>;
};

/** Shown when the API is unreachable or the account has no inventory activity yet. */
export const DEMO_DASHBOARD: DashboardViewData = {
  isDemo: true,
  totalProducts: 48,
  totalStockValue: 1_842_500,
  lowStockCount: 5,
  recentTransactions: 37,
  monthlyMovement: [
    { month: 'Nov 2025', receipts: 12, issues: 8 },
    { month: 'Dec 2025', receipts: 15, issues: 10 },
    { month: 'Jan 2026', receipts: 18, issues: 9 },
    { month: 'Feb 2026', receipts: 14, issues: 11 },
    { month: 'Mar 2026', receipts: 21, issues: 13 },
    { month: 'Apr 2026', receipts: 9, issues: 6 },
  ],
  categoryBreakdown: [
    { category: 'Grocery', count: 18 },
    { category: 'Beverages', count: 12 },
    { category: 'Household', count: 10 },
    { category: 'Uncategorized', count: 8 },
  ],
  recentGoodsReceipts: [
    {
      id: 'demo-gr-1',
      grNumber: 'GR-2026-0142',
      grDate: new Date().toISOString(),
      supplier: 'Ceylon Wholesale Traders',
      totalValue: 128_400,
      status: 'POSTED',
    },
    {
      id: 'demo-gr-2',
      grNumber: 'GR-2026-0141',
      grDate: new Date(Date.now() - 86400000).toISOString(),
      supplier: 'Metro Dry Foods',
      totalValue: 86_200,
      status: 'POSTED',
    },
    {
      id: 'demo-gr-3',
      grNumber: 'GR-2026-0138',
      grDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      supplier: 'Lanka Packaging Ltd',
      totalValue: 42_950,
      status: 'DRAFT',
    },
  ],
  recentGoodsIssues: [
    {
      id: 'demo-gi-1',
      giNumber: 'GI-2026-0097',
      giDate: new Date().toISOString(),
      issueReason: 'Shop floor consumption',
      status: 'POSTED',
    },
    {
      id: 'demo-gi-2',
      giNumber: 'GI-2026-0096',
      giDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      issueReason: 'Damaged in transit',
      status: 'POSTED',
    },
    {
      id: 'demo-gi-3',
      giNumber: 'GI-2026-0094',
      giDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      issueReason: 'Inter-store transfer',
      status: 'DRAFT',
    },
  ],
  lowStockProducts: [
    {
      id: 'demo-p-1',
      productCode: 'SKU-10432',
      description: 'Basmati Rice 5kg',
      currentStock: 4,
      minStockLevel: 20,
    },
    {
      id: 'demo-p-2',
      productCode: 'SKU-22011',
      description: 'Coconut Oil 1L',
      currentStock: 8,
      minStockLevel: 24,
    },
    {
      id: 'demo-p-3',
      productCode: 'SKU-88102',
      description: 'Laundry Detergent 2kg',
      currentStock: 6,
      minStockLevel: 15,
    },
  ],
};

export function shouldUseDemoDashboard(data: DashboardViewData | null | undefined): boolean {
  if (!data) return true;
  if (data.totalProducts > 0) return false;
  if (data.totalStockValue > 0) return false;
  if ((data.recentGoodsReceipts?.length ?? 0) > 0) return false;
  if ((data.recentGoodsIssues?.length ?? 0) > 0) return false;
  if ((data.lowStockProducts?.length ?? 0) > 0) return false;
  if (data.monthlyMovement?.some((m) => m.receipts > 0 || m.issues > 0)) return false;
  return true;
}

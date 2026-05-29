import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useDashboard, type DashboardViewData } from '@/hooks/use-dashboard';
import { EMPTY_DASHBOARD } from '@/lib/dashboard-demo-data';
import {
  DashboardKpiCard,
  DashboardKpiCardSkeleton,
} from '@/components/dashboard/DashboardKpiCard';
import { DashboardInsightsPanel } from '@/components/dashboard/DashboardInsightsPanel';
import { computePeriodTrend } from '@/lib/kpi-trend';
import { useShops } from '@/hooks/use-shops';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { isAdminUser, productListShopId } from '@/lib/shop-scope';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CHART_THEME = {
  tick: '#64748b',
  grid: '#e2e8f0',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipFg: '#0f172a',
  legend: '#475569',
} as const;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

type ReorderSuggestion = {
  productId: string;
  shopId: string;
  supplier: string | null;
  orderQty: number;
  rate: number;
  currentStock: number;
  minStockLevel: number;
  suggestedQty: number;
  hasPriorOrder: boolean;
  lastPoNumber: string | null;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(user);
  const { data: shopList = [] } = useShops();
  const [shopFilter, setShopFilter] = useState<string>('all');
  const dashboardShopId = productListShopId(user, shopFilter);
  const { data, isLoading, isError, error, refetch } = useDashboard(dashboardShopId);
  const chart = CHART_THEME;
  const reducedMotion = usePrefersReducedMotion();
  const chartAnimate = !reducedMotion;

  const handleLowStockReorder = async (p: {
    id: string;
    shopId: string;
  }) => {
    try {
      const res = await api.get(`/products/${p.id}/reorder-suggestion`, {
        params: { shop_id: p.shopId },
      });
      const suggestion = res.data?.data as ReorderSuggestion;
      navigate('/purchase-orders/new', { state: { poPrefill: suggestion } });
      if (suggestion.hasPriorOrder && suggestion.supplier) {
        toast.success(`Opening PO with supplier ${suggestion.supplier}`);
      } else {
        toast.message('No prior PO for this product — pick a supplier on the order form');
      }
    } catch {
      toast.error('Could not load reorder details');
    }
  };

  const dashboard = data as DashboardViewData | undefined;

  const lowStockReportPath = useMemo(() => {
    const params = new URLSearchParams({ tab: 'low-stock' });
    if (dashboardShopId) params.set('shopId', dashboardShopId);
    return `/reports?${params.toString()}`;
  }, [dashboardShopId]);

  const kpiCards = useMemo(() => {
    const ctx = dashboard?.kpiContext ?? EMPTY_DASHBOARD.kpiContext;
    const added = ctx.productsAddedThisMonth;
    const productsContext =
      added > 0 ? `+${added.toLocaleString('en-IN')} this month` : 'No new products this month';
    const transactionTrend = computePeriodTrend(
      dashboard?.recentTransactions ?? 0,
      ctx.transactionsPriorPeriod,
    );

    return [
      {
        key: 'products',
        label: 'Total Products',
        numericValue: dashboard?.totalProducts ?? 0,
        context: productsContext,
        icon: Package,
        iconClassName: 'text-blue-600',
        iconWrapClassName: 'bg-blue-500/15 border border-blue-400/20',
        ariaLabel: `Total Products: ${(dashboard?.totalProducts ?? 0).toLocaleString('en-IN')}. View products.`,
        onClick: () => navigate('/products'),
      },
      {
        key: 'stock-value',
        label: 'Total Stock Value',
        numericValue: dashboard?.totalStockValue ?? 0,
        format: formatInr,
        context: `Avg product value ${formatInr(ctx.stockValueAvgPerProduct)}`,
        icon: DollarSign,
        iconClassName: 'text-emerald-600',
        iconWrapClassName: 'bg-emerald-500/15 border border-emerald-400/20',
        tooltip:
          'Calculated using current quantity × unit cost across all inventory items.',
        ariaLabel: `Total Stock Value: ${formatInr(dashboard?.totalStockValue ?? 0)}. View products.`,
        onClick: () => navigate('/products'),
      },
      {
        key: 'low-stock',
        label: 'Low Stock Alerts',
        numericValue: dashboard?.lowStockCount ?? 0,
        context: `Critical: ${dashboard?.lowStockCriticalCount ?? 0} · Warning: ${dashboard?.lowStockWarningCount ?? 0}`,
        icon: AlertTriangle,
        iconClassName: 'text-amber-600',
        iconWrapClassName: 'bg-amber-500/15 border border-amber-400/20',
        ariaLabel: `Low Stock Alerts: ${dashboard?.lowStockCount ?? 0} items. View low stock report.`,
        onClick: () => navigate(lowStockReportPath),
      },
      {
        key: 'transactions',
        label: 'Recent Transactions',
        numericValue: dashboard?.recentTransactions ?? 0,
        context: 'Posted GR & GI in the last 30 days',
        trend: transactionTrend,
        icon: ArrowRightLeft,
        iconClassName: 'text-violet-600',
        iconWrapClassName: 'bg-violet-500/15 border border-violet-400/20',
        ariaLabel: `Recent Transactions: ${dashboard?.recentTransactions ?? 0}. View stock movement history.`,
        onClick: () => navigate('/reports?tab=stock-ledger'),
      },
    ];
  }, [dashboard, lowStockReportPath, navigate]);

  return (
    <AppLayout active="Dashboard">
      <div className="dashboard-normal space-y-6">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${user?.name ?? 'User'} — inventory overview at a glance`}
        >
          {isAdmin && shopList.length > 0 && (
            <Select value={shopFilter} onValueChange={setShopFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[200px]">
                <SelectValue placeholder="Plant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plants</SelectItem>
                {shopList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shopName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </PageHeader>

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Could not load dashboard data.
            {error instanceof Error && error.message ? ` ${error.message}` : ''}
            <Button variant="link" className="ml-2 h-auto p-0 text-destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <DashboardKpiCardSkeleton key={i} />)
            : kpiCards.map((card) => <DashboardKpiCard key={card.key} {...card} />)}
        </div>

        <DashboardInsightsPanel
          dashboard={dashboard}
          shopId={dashboardShopId}
          isLoading={isLoading}
        />

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card interactive className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Stock Movement (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboard?.monthlyMovement ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: chart.tick }}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: chart.tick }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chart.tooltipBg,
                        border: `1px solid ${chart.tooltipBorder}`,
                        borderRadius: 8,
                        color: chart.tooltipFg,
                      }}
                    />
                    <Legend wrapperStyle={{ color: chart.legend }} />
                    <Bar
                      dataKey="receipts"
                      name="Receipts"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={chartAnimate}
                      animationDuration={600}
                    />
                    <Bar
                      dataKey="issues"
                      name="Issues"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={chartAnimate}
                      animationDuration={600}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card interactive className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Products by Category</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Counts come from each product&apos;s saved category in the database (not the Settings
                category list).
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboard?.categoryBreakdown ?? []}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      isAnimationActive={chartAnimate}
                      animationDuration={600}
                      label={({ category, percent }) =>
                        `${category} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {(dashboard?.categoryBreakdown ?? []).map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chart.tooltipBg,
                        border: `1px solid ${chart.tooltipBorder}`,
                        borderRadius: 8,
                        color: chart.tooltipFg,
                      }}
                    />
                    <Legend wrapperStyle={{ color: chart.legend }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card interactive className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Recent Goods Receipts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton />
              ) : !dashboard?.recentGoodsReceipts?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No recent goods receipts.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GR Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentGoodsReceipts.map((gr, index) => (
                      <TableRow
                        key={gr.id}
                        className="motion-fade-up"
                        style={{ animationDelay: `${Math.min(index, 4) * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {gr.grNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(gr.grDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{gr.supplier}</TableCell>
                        <TableCell className="text-right">
                          ₹{gr.totalValue?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={gr.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card interactive className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Recent Goods Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton />
              ) : !dashboard?.recentGoodsIssues?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No recent goods issues.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GI Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentGoodsIssues.map((gi, index) => (
                      <TableRow
                        key={gi.id}
                        className="motion-fade-up"
                        style={{ animationDelay: `${Math.min(index, 4) * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {gi.giNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(gi.giDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{gi.issueReason}</TableCell>
                        <TableCell>
                          <StatusBadge status={gi.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top products by stock value */}
        <Card className="surface-1">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Top Products by Stock Value
              </CardTitle>
              <p className="text-xs font-normal text-muted-foreground">
                Highest inventory value (unit cost × on-hand stock) for your plant.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => navigate('/products')}
            >
              View all products
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} />
            ) : !dashboard?.topProducts?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No products with stock value yet. Add products and post goods receipts to see rankings.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.topProducts.map((p, index) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate('/products')}
                    >
                      <TableCell className="text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{p.productCode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.currentStock}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatAmount(p.unitCost)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatAmount(p.stockValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Click a row to start a purchase order with your last supplier and suggested qty.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={3} />
            ) : !dashboard?.lowStockProducts?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                All products are sufficiently stocked.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.lowStockProducts.map((p) => {
                    const isCritical =
                      p.currentStock === 0 ||
                      (p.minStockLevel > 0 && p.currentStock < 0.25 * p.minStockLevel);
                    const severity = isCritical ? 'Critical' : 'Warning';
                    const variant: 'destructive' | 'warning' = isCritical ? 'destructive' : 'warning';
                    return (
                      <TableRow
                        key={`${p.id}-${p.shopId}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleLowStockReorder(p)}
                      >
                        <TableCell className="font-medium">
                          {p.productCode}
                        </TableCell>
                        <TableCell>{p.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {p.currentStock}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.minStockLevel}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant}>{severity}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import { useMemo } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useDashboard, type DashboardViewData } from '@/hooks/use-dashboard';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <Card className="surface-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
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
  const { data, isLoading } = useDashboard();

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

  const stats = useMemo(
    () => [
      {
        title: 'Total Products',
        value: dashboard?.totalProducts ?? 0,
        icon: Package,
        color: 'text-blue-300',
        bg: 'bg-blue-500/15 border border-blue-400/20',
      },
      {
        title: 'Total Stock Value',
        value: dashboard?.totalStockValue
          ? `₹${dashboard.totalStockValue.toLocaleString()}`
          : '₹0',
        icon: DollarSign,
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/15 border border-emerald-400/20',
      },
      {
        title: 'Low Stock Items',
        value: dashboard?.lowStockCount ?? 0,
        icon: AlertTriangle,
        color: 'text-amber-300',
        bg: 'bg-amber-500/15 border border-amber-400/20',
      },
      {
        title: 'Recent Transactions',
        value: dashboard?.recentTransactions ?? 0,
        icon: ArrowRightLeft,
        color: 'text-violet-300',
        bg: 'bg-violet-500/15 border border-violet-400/20',
      },
    ],
    [dashboard],
  );

  return (
    <AppLayout active="Dashboard">
      <div className="dashboard-normal space-y-5">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${user?.name ?? 'User'}`}
        />

        {/* Stat cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Stock Movement (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboard?.monthlyMovement ?? []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="receipts"
                      name="Receipts"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="issues"
                      name="Issues"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">Products by Category</CardTitle>
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
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">
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
                    {dashboard.recentGoodsReceipts.map((gr) => (
                      <TableRow key={gr.id}>
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

          <Card className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">Recent Goods Issues</CardTitle>
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
                    {dashboard.recentGoodsIssues.map((gi) => (
                      <TableRow key={gi.id}>
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

        {/* Low stock alerts */}
        <Card className="surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
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
                    const ratio =
                      p.minStockLevel > 0
                        ? p.currentStock / p.minStockLevel
                        : 0;
                    const severity =
                      ratio === 0
                        ? 'Out of Stock'
                        : ratio < 0.5
                          ? 'Critical'
                          : 'Low';
                    const variant: 'destructive' | 'warning' =
                      ratio < 0.5 ? 'destructive' : 'warning';
                    return (
                      <TableRow
                        key={`${p.id}-${p.shopId}`}
                        className="cursor-pointer hover:bg-slate-50"
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

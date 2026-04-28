import { useMemo } from 'react';
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}
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

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboard();

  const dashboard = data as DashboardViewData | undefined;

  const stats = useMemo(
    () => [
      {
        title: 'Total Products',
        value: dashboard?.totalProducts ?? 0,
        icon: Package,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        title: 'Total Stock Value',
        value: dashboard?.totalStockValue
          ? `₹${dashboard.totalStockValue.toLocaleString()}`
          : '₹0',
        icon: DollarSign,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        title: 'Low Stock Items',
        value: dashboard?.lowStockCount ?? 0,
        icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        title: 'Recent Transactions',
        value: dashboard?.recentTransactions ?? 0,
        icon: ArrowRightLeft,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
      },
    ],
    [dashboard],
  );

  return (
    <AppLayout active="Dashboard">
      <div className="dashboard-normal space-y-6">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${user?.name ?? 'User'}`}
        />

        {dashboard?.isDemo ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <span className="font-semibold">Sample dashboard data.</span>{' '}
            Live totals will appear once products and stock movements exist in your database, or when the API is
            reachable. Add inventory via Products and Goods Receipt, or run the API seed script.
          </div>
        ) : null}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products by Category</CardTitle>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Goods Issues</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
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
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.productCode}
                        </TableCell>
                        <TableCell>{p.description}</TableCell>
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

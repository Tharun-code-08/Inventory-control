import { usePlatformDashboard } from '@/hooks/use-platform-dashboard';
import {
  useMarkAllPlatformNotificationsRead,
  useMarkPlatformNotificationRead,
  usePlatformHealth,
  usePlatformNotifications,
  usePlatformUnreadCount,
} from '@/hooks/use-platform-notifications';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInr } from '@/lib/format-money';
import { cn } from '@/lib/cn';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function severityVariant(severity: string) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'destructive' as const;
  if (severity === 'WARNING') return 'secondary' as const;
  return 'outline' as const;
}

export function PlatformSubscriptionsPage() {
  const { data, isLoading, isError } = usePlatformDashboard();
  const notificationsQuery = usePlatformNotifications();
  const unreadQuery = usePlatformUnreadCount();
  const healthQuery = usePlatformHealth();
  const markRead = useMarkPlatformNotificationRead();
  const markAllRead = useMarkAllPlatformNotificationsRead();

  if (isLoading) {
    return (
      <AppLayout active="/platform/subscriptions">
        <p className="text-sm text-muted-foreground">Loading platform dashboard...</p>
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout active="/platform/subscriptions">
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          Platform admin access required. Set PLATFORM_ADMIN_EMAILS on the server and sign in with an
          allowlisted account.
        </div>
      </AppLayout>
    );
  }

  const { kpis } = data;

  return (
    <AppLayout active="/platform/subscriptions">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Platform subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trial conversion, paid subscribers, renewals, revenue alerts, and infrastructure health.
          </p>
          {(unreadQuery.data ?? 0) > 0 ? (
            <p className="mt-2 text-sm font-medium text-primary">
              {unreadQuery.data} unread platform notification{(unreadQuery.data ?? 0) === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        {healthQuery.data ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Infrastructure health</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Database</p>
                <p className={cn('font-semibold', healthQuery.data.database.usagePct >= 80 && 'text-amber-700 dark:text-amber-300')}>
                  {healthQuery.data.database.usagePct}% used
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">CPU load</p>
                <p className="font-semibold">{healthQuery.data.cpuLoadPct}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Memory</p>
                <p className="font-semibold">{healthQuery.data.memoryUsagePct}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">API errors (since last check)</p>
                <p className="font-semibold">{healthQuery.data.httpErrorsDelta5m}</p>
              </div>
              {healthQuery.data.disk.map((disk) => (
                <div key={disk.path}>
                  <p className="truncate text-muted-foreground" title={disk.path}>
                    Disk free
                  </p>
                  <p className={cn('font-semibold', disk.freePct >= 0 && disk.freePct < 15 && 'text-red-700 dark:text-red-300')}>
                    {disk.freePct < 0 ? 'n/a' : `${disk.freePct}%`}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Platform notifications</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(notificationsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">No platform alerts yet.</p>
            ) : (
              (notificationsQuery.data ?? []).slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.isRead) markRead.mutate(item.id);
                  }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left',
                    !item.isRead ? 'border-border bg-muted' : 'border-border',
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                    <Badge variant="outline">{item.category}</Badge>
                    {!item.isRead ? <Badge>New</Badge> : null}
                  </div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active trials" value={kpis.activeTrials} />
          <KpiCard label="Expiring trials (7d)" value={kpis.expiringTrials} />
          <KpiCard label="Paid subscribers" value={kpis.paidSubscribers} />
          <KpiCard label="Conversion rate (30d)" value={`${kpis.conversionRate30d}%`} />
          <KpiCard label="MRR (INR)" value={formatInr(kpis.mrrInr)} />
          <KpiCard label="ARR (INR)" value={formatInr(kpis.arrInr)} />
          <KpiCard label="Conversions (30d)" value={kpis.conversions30d} />
          <KpiCard label="Expired / churned" value={kpis.churnExpired} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming renewals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.upcomingRenewals.length === 0 ? (
                <p className="text-muted-foreground">No renewals in the next 30 days.</p>
              ) : (
                data.upcomingRenewals.map((row) => (
                  <div key={row.companyId} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{row.companyName}</span>
                    <Badge variant="secondary">{row.plan}</Badge>
                    <span className="text-muted-foreground">
                      {row.renewsAt ? new Date(row.renewsAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Failed payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.failedPayments.length === 0 ? (
                <p className="text-muted-foreground">No failed payments.</p>
              ) : (
                data.failedPayments.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                    <p className="font-medium text-foreground">{row.companyName}</p>
                    <p className="text-muted-foreground">
                      {row.plan} · {formatInr(row.amountPaise / 100)} · attempt {row.renewalAttempt}
                    </p>
                    {row.failureReason ? (
                      <p className="text-xs text-red-600 dark:text-red-400">{row.failureReason}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform email analytics</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Template</th>
                  <th className="pb-2 pr-4 font-medium">Sent</th>
                  <th className="pb-2 pr-4 font-medium">Clicks</th>
                  <th className="pb-2 font-medium">Opens</th>
                </tr>
              </thead>
              <tbody>
                {data.emailAnalytics.map((row) => (
                  <tr key={row.templateId} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-mono text-xs">{row.templateId}</td>
                    <td className="py-2 pr-4">{row.sent}</td>
                    <td className="py-2 pr-4">{row.clicks}</td>
                    <td className="py-2">{row.opens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent lifecycle snapshots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.lifecycleStages.map((row, idx) => (
              <div key={`${row.companyName}-${idx}`} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{row.companyName}</span>
                <Badge variant="outline">{row.stage}</Badge>
                {row.trialProgressPct > 0 ? (
                  <span className="text-muted-foreground">Trial progress {row.trialProgressPct}%</span>
                ) : null}
                <span className="text-muted-foreground">{row.snapshotDate}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

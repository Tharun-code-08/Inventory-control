import { usePlatformDashboard } from '@/hooks/use-platform-dashboard';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInr } from '@/lib/format-money';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export function PlatformSubscriptionsPage() {
  const { data, isLoading, isError } = usePlatformDashboard();

  if (isLoading) {
    return (
      <AppLayout active="/platform/subscriptions">
        <p className="text-sm text-slate-500">Loading platform dashboard...</p>
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout active="/platform/subscriptions">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
          <h1 className="text-2xl font-semibold text-slate-900">Platform subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Trial conversion, paid subscribers, renewals, and email performance.
          </p>
        </div>

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
                <p className="text-slate-500">No renewals in the next 30 days.</p>
              ) : (
                data.upcomingRenewals.map((row) => (
                  <div key={row.companyId} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{row.companyName}</span>
                    <Badge variant="secondary">{row.plan}</Badge>
                    <span className="text-slate-500">
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
                <p className="text-slate-500">No failed payments.</p>
              ) : (
                data.failedPayments.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <p className="font-medium text-slate-900">{row.companyName}</p>
                    <p className="text-slate-500">
                      {row.plan} · {formatInr(row.amountPaise / 100)} · attempt {row.renewalAttempt}
                    </p>
                    {row.failureReason ? (
                      <p className="text-xs text-red-600">{row.failureReason}</p>
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
                <tr className="border-b text-left text-slate-500">
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
                <span className="font-medium text-slate-900">{row.companyName}</span>
                <Badge variant="outline">{row.stage}</Badge>
                {row.trialProgressPct > 0 ? (
                  <span className="text-slate-500">Trial progress {row.trialProgressPct}%</span>
                ) : null}
                <span className="text-slate-400">{row.snapshotDate}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

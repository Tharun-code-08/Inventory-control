import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, CreditCard, Download, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared';
import { PricingSection } from '@/components/PricingSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  downloadSubscriptionInvoicePdf,
  useSubscriptionInvoices,
} from '@/hooks/use-billing-invoices';
import { formatInr } from '@/lib/format-money';
import { planDisplayName, type SubscriptionSnapshot } from '@/lib/plans';

async function fetchSubscription(): Promise<SubscriptionSnapshot> {
  const res = await api.get('/billing/subscription');
  return res.data?.data ?? res.data;
}

function lifecycleStageLabel(stage: string | null | undefined): string | null {
  if (!stage) return null;
  return stage.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function PlanStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 bg-white p-4 dark:bg-slate-950">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function UpgradePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: fetchSubscription,
  });
  const { data: invoices = [], isLoading: invoicesLoading } = useSubscriptionInvoices();

  useEffect(() => {
    if (searchParams.get('unsubscribe') !== '1') return;
    void (async () => {
      try {
        await api.post('/billing/marketing-opt-out');
        toast.success('Unsubscribed from marketing emails');
      } catch {
        toast.error('Could not update email preferences');
      } finally {
        searchParams.delete('unsubscribe');
        searchParams.delete('company');
        setSearchParams(searchParams, { replace: true });
      }
    })();
  }, [searchParams, setSearchParams]);

  async function handlePaidUpgrade(payload: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    await api.post('/billing/upgrade', {
      razorpay_order_id: payload.orderId,
      razorpay_payment_id: payload.paymentId,
      razorpay_signature: payload.signature,
    });
    await queryClient.invalidateQueries({ queryKey: ['billing'] });
  }

  async function handleDownloadInvoice(invoiceId: string, invoiceNumber: string) {
    try {
      const blob = await downloadSubscriptionInvoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download invoice');
    }
  }

  const stageLabel = lifecycleStageLabel(data?.lifecycleStage);

  return (
    <AppLayout active="/upgrade">
      <div className="space-y-6">
        <PageHeader title="Upgrade" description="Manage your organisation plan, trial, and billing.">
          {data ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {planDisplayName(data.plan)} plan
            </Badge>
          ) : null}
          {stageLabel ? <Badge variant="outline">{stageLabel}</Badge> : null}
        </PageHeader>

        {/* Current plan hero */}
        <Card className="overflow-hidden border-slate-200/80">
          {isLoading ? (
            <CardContent className="p-6 text-sm text-muted-foreground">Loading plan details…</CardContent>
          ) : data ? (
            <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
              <div className="relative flex flex-col gap-4 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-6 left-10 h-20 w-20 rounded-full bg-cyan-400/20 blur-2xl" />
                <div className="relative flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  <Sparkles className="h-4 w-4" /> Current plan
                </div>
                <div className="relative">
                  <p className="text-3xl font-semibold tracking-tight">{planDisplayName(data.plan)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        data.status === 'ACTIVE'
                          ? 'bg-emerald-400/15 text-emerald-300'
                          : 'bg-amber-400/15 text-amber-300',
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {data.status}
                    </span>
                    {stageLabel ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-200">
                        {stageLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                {data.plan === 'TRIAL' && data.trialProgressPct != null ? (
                  <div className="relative mt-auto">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>Trial setup progress</span>
                      <span>{data.trialProgressPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300 transition-all"
                        style={{ width: `${data.trialProgressPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
                {data.plan === 'TRIAL' ? (
                  <PlanStat
                    icon={<CalendarClock className="h-4 w-4" />}
                    label="Trial days left"
                    value={data.isTrialExpired ? 'Expired' : `${data.daysLeftInTrial ?? 0} days`}
                  />
                ) : (
                  <PlanStat
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Billing"
                    value={data.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'}
                  />
                )}
                <PlanStat
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Status"
                  value={data.status}
                />
                <PlanStat
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Renews / ends"
                  value={
                    data.subscriptionEndsAt
                      ? new Date(data.subscriptionEndsAt).toLocaleDateString()
                      : '—'
                  }
                />
                <PlanStat
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Plan"
                  value={planDisplayName(data.plan)}
                />
              </div>
            </div>
          ) : (
            <CardContent className="p-6 text-sm text-muted-foreground">
              Could not load subscription.
            </CardContent>
          )}
        </Card>

        {!invoicesLoading && data && data.plan !== 'TRIAL' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscription invoices</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {invoices.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No invoices yet. Refresh this page — invoices for your current plan are generated
                  automatically.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Invoice</th>
                    <th className="pb-2 pr-4 font-medium">Plan</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 font-medium text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-2 pr-4">{inv.plan}</td>
                      <td className="py-2 pr-4">{formatInr(inv.totalPaise / 100)}</td>
                      <td className="py-2 pr-4">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDownloadInvoice(inv.id, inv.invoiceNumber)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {data?.isTrialExpired ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your trial has ended. Upgrade to Pro or Plus to restore full access.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <PricingSection
            variant="upgrade"
            currentPlan={data?.plan}
            onPaidUpgrade={async (payload) => {
              try {
                await handlePaidUpgrade(payload);
                toast.success('Plan upgraded successfully');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Upgrade failed');
                throw err;
              }
            }}
          />
        </div>
      </div>
    </AppLayout>
  );
}

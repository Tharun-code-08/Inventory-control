import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { AppLayout } from '@/components/AppLayout';
import { PricingSection } from '@/components/PricingSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Upgrade</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your organisation plan, trial, and billing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data ? (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {planDisplayName(data.plan)} plan
              </Badge>
            ) : null}
            {stageLabel ? <Badge variant="outline">{stageLabel}</Badge> : null}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current subscription</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <p>Loading plan details...</p>
            ) : data ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Plan</p>
                  <p className="font-medium text-slate-900">{planDisplayName(data.plan)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                  <p className="font-medium text-slate-900">{data.status}</p>
                </div>
                {data.plan === 'TRIAL' ? (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Trial days left</p>
                      <p className="font-medium text-slate-900">
                        {data.isTrialExpired ? 'Expired' : `${data.daysLeftInTrial ?? 0} days`}
                      </p>
                    </div>
                    {data.trialProgressPct != null ? (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Trial setup progress</span>
                          <span>{data.trialProgressPct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${data.trialProgressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Billing</p>
                    <p className="font-medium text-slate-900">
                      {data.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'}
                    </p>
                  </div>
                )}
                {data.subscriptionEndsAt ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Renews / ends</p>
                    <p className="font-medium text-slate-900">
                      {new Date(data.subscriptionEndsAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p>Could not load subscription.</p>
            )}
          </CardContent>
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

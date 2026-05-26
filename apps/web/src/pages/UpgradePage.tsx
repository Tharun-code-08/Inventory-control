import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { AppLayout } from '@/components/AppLayout';
import { PricingSection } from '@/components/PricingSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { planDisplayName, type SubscriptionSnapshot } from '@/lib/plans';

async function fetchSubscription(): Promise<SubscriptionSnapshot> {
  const res = await api.get('/billing/subscription');
  return res.data?.data ?? res.data;
}

export function UpgradePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: fetchSubscription,
  });

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
    await queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
  }

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
          {data ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {planDisplayName(data.plan)} plan
            </Badge>
          ) : null}
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
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Trial days left</p>
                    <p className="font-medium text-slate-900">
                      {data.isTrialExpired ? 'Expired' : `${data.daysLeftInTrial ?? 0} days`}
                    </p>
                  </div>
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

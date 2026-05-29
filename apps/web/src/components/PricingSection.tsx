import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import {
  PLAN_CATALOG,
  UPGRADE_HIGHLIGHTS,
  planPrice,
  yearlySavingsLabel,
  isDemoPlusPricing,
  subscriptionPlanTier,
  type BillingInterval,
  type PlanId,
} from '@/lib/plans';
import { useRazorpayCheckout } from '@/hooks/use-razorpay-checkout';
import { openRazorpayPaymentLink } from '@/lib/razorpay-payment-links';

type PricingSectionProps = {
  variant?: 'landing' | 'upgrade';
  currentPlan?: PlanId | 'TRIAL' | 'PRO' | 'PLUS';
  onPaidUpgrade?: (payload: {
    orderId: string;
    paymentId: string;
    signature: string;
    plan: Exclude<PlanId, 'trial'>;
    billing: BillingInterval;
  }) => void | Promise<void>;
};

function normalizePlan(plan?: PricingSectionProps['currentPlan']): PlanId | undefined {
  if (!plan) return undefined;
  if (plan === 'TRIAL') return 'trial';
  if (plan === 'PRO') return 'pro';
  if (plan === 'PLUS') return 'plus';
  return plan;
}

export function PricingSection({ variant = 'landing', currentPlan, onPaidUpgrade }: PricingSectionProps) {
  const nav = useNavigate();
  const [billing, setBilling] = useState<BillingInterval>('monthly');
  const { checkout, loading } = useRazorpayCheckout();
  const active = normalizePlan(currentPlan);
  const activeTier = active ? subscriptionPlanTier(active) : null;
  const isUpgrade = variant === 'upgrade';
  const lightSurface = variant === 'landing' || isUpgrade;

  async function handlePlanClick(plan: PlanId) {
    // Public (unauthenticated) flow: send users to signup with plan context.
    if (!onPaidUpgrade) {
      const params = new URLSearchParams({ plan });
      if (plan !== 'trial') params.set('billing', billing);
      nav(`/signup?${params.toString()}`);
      return;
    }

    // In-app upgrade: payment link or Razorpay checkout modal.
    if (plan === 'trial') return;

    const useHostedPaymentLink = (plan === 'pro' || plan === 'plus') && !(plan === 'plus' && isDemoPlusPricing());
    if (useHostedPaymentLink) {
      if (openRazorpayPaymentLink(plan)) {
        toast.message('Complete payment on Razorpay. Your plan updates after payment is confirmed.');
        return;
      }
    }

    try {
      await checkout({
        plan,
        billing,
        onSuccess: async (response) => {
          await onPaidUpgrade({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            plan,
            billing,
          });
          toast.success('Payment verified. Your plan is active.');
        },
        onDismiss: () => toast.message('Payment cancelled'),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment could not be completed';
      if (msg !== 'Payment cancelled') toast.error(msg);
    }
  }

  return (
    <section
      id="pricing"
      className={lightSurface ? 'border-y border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50' : 'bg-white'}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2
            className={
              lightSurface ? 'text-3xl font-semibold text-slate-900 sm:text-4xl' : 'text-3xl font-semibold text-slate-900 sm:text-4xl'
            }
          >
            Plans &amp; Pricing
          </h2>
          <p className={`mx-auto mt-3 max-w-2xl ${lightSurface ? 'text-slate-600' : 'text-slate-600'}`}>
            Flexible plans for warehouses of every size. No lock-in, cancel anytime.
          </p>
          <div
            className={
              lightSurface
                ? 'mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm'
                : 'mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm'
            }
          >
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                billing === 'monthly'
                  ? 'bg-white text-slate-900 shadow'
                  : lightSurface
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                billing === 'yearly'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white',
              )}
            >
              Yearly
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {yearlySavingsLabel()}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {(['trial', 'pro', 'plus'] as PlanId[]).map((planId) => {
            const plan = PLAN_CATALOG[planId];
            const price =
              planId === 'trial'
                ? 0
                : planPrice(planId as Exclude<PlanId, 'trial'>, billing);
            const isCurrent = active === planId;
            const isDowngrade =
              activeTier != null && subscriptionPlanTier(planId) < activeTier;
            const cardBase = lightSurface
              ? 'flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm'
              : 'flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm';
            const borderClass =
              planId === 'pro'
                ? 'border-emerald-200 shadow-[0_12px_30px_rgba(16,185,129,0.12)]'
                : planId === 'plus'
                  ? 'border-violet-200 shadow-[0_12px_30px_rgba(139,92,246,0.12)]'
                  : 'border-slate-200 shadow-[0_10px_26px_rgba(15,23,42,0.06)]';

            return (
              <div
                key={planId}
                className={cn(
                  cardBase,
                  borderClass,
                  isCurrent && 'ring-2 ring-indigo-200',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {plan.name}
                  </h3>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      planId === 'pro' && 'bg-emerald-50 text-emerald-700',
                      planId === 'plus' && 'bg-violet-50 text-violet-700',
                      planId === 'trial' && 'bg-blue-50 text-blue-700',
                    )}
                  >
                    {plan.badge}
                  </span>
                </div>

                <div className="mt-5">
                  {planId === 'trial' ? (
                    <p className="text-4xl font-bold text-slate-900">
                      ₹0 <span className="text-lg font-medium text-slate-500">free</span>
                    </p>
                  ) : (
                    <p className="text-4xl font-bold text-slate-900">
                      ₹{price}
                      {plan.originalMonthly && billing === 'monthly' && !(planId === 'plus' && isDemoPlusPricing()) ? (
                        <span className="ml-2 text-lg font-medium text-slate-500 line-through">
                          ₹{plan.originalMonthly}
                        </span>
                      ) : null}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    {planId === 'trial'
                      ? 'No credit card required'
                      : billing === 'yearly'
                        ? '/month · billed yearly'
                        : '/month · billed monthly'}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className={feature.included ? 'text-slate-900' : 'text-slate-500'}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={loading || isCurrent || isDowngrade}
                  onClick={() => void handlePlanClick(planId)}
                  className={cn(
                    'mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60',
                    planId === 'pro' &&
                      'border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500',
                    planId === 'plus' &&
                      'border border-violet-500 bg-violet-600 text-white hover:bg-violet-500',
                    planId === 'trial' &&
                      'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                  )}
                >
                  {isCurrent
                    ? 'Current plan'
                    : isDowngrade
                      ? 'Downgrade blocked'
                      : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-14">
          <h3 className="text-center text-2xl font-semibold text-slate-900">
            Why upgrade from Trial?
          </h3>
          <p className="mt-2 text-center text-slate-600">
            Key advantages of paid plans over the free trial
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {UPGRADE_HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h4 className="font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {variant === 'landing' ? (
          <p className="mt-10 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

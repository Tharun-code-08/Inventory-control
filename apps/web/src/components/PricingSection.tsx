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
  type BillingInterval,
  type PlanId,
} from '@/lib/plans';
import { useRazorpayCheckout } from '@/hooks/use-razorpay-checkout';

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

  async function handlePlanClick(plan: PlanId) {
    // Public (unauthenticated) flow: send users to signup with plan context.
    if (!onPaidUpgrade) {
      const params = new URLSearchParams({ plan });
      if (plan !== 'trial') params.set('billing', billing);
      nav(`/signup?${params.toString()}`);
      return;
    }

    // In-app upgrade: open Razorpay directly.
    if (plan === 'trial') return;

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
      className={
        variant === 'landing'
          ? 'border-y border-white/10 bg-gradient-to-b from-[#0b1024] via-[#0f1a35] to-[#0b1024]'
          : 'bg-[#0b1024]'
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-slate-50 sm:text-4xl">Plans &amp; Pricing</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Flexible plans for warehouses of every size. No lock-in, cancel anytime.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 shadow-lg shadow-slate-900/40 backdrop-blur">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                billing === 'monthly'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-200 hover:text-white hover:bg-white/10',
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
                  : 'text-slate-200 hover:text-white hover:bg-white/10',
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
            const borderClass =
              planId === 'pro'
                ? 'border-emerald-400/50 shadow-[0_15px_40px_rgba(16,185,129,0.18)]'
                : planId === 'plus'
                  ? 'border-violet-400/50 shadow-[0_15px_40px_rgba(139,92,246,0.18)]'
                  : 'border-white/10 shadow-[0_10px_32px_rgba(15,23,42,0.45)]';

            return (
              <div
                key={planId}
                className={cn(
                  'flex flex-col rounded-2xl border bg-white/10 p-6 text-slate-100 backdrop-blur',
                  borderClass,
                  isCurrent && 'ring-2 ring-indigo-300/70',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      planId === 'pro' && 'bg-emerald-500/15 text-emerald-200',
                      planId === 'plus' && 'bg-violet-500/15 text-violet-200',
                      planId === 'trial' && 'bg-blue-500/15 text-blue-200',
                    )}
                  >
                    {plan.badge}
                  </span>
                </div>

                <div className="mt-5">
                  {planId === 'trial' ? (
                    <p className="text-4xl font-bold text-white">
                      ₹0 <span className="text-lg font-medium text-slate-300">free</span>
                    </p>
                  ) : (
                    <p className="text-4xl font-bold text-white">
                      ₹{price}
                      {plan.originalMonthly && billing === 'monthly' && !(planId === 'plus' && isDemoPlusPricing()) ? (
                        <span className="ml-2 text-lg font-medium text-slate-500 line-through">
                          ₹{plan.originalMonthly}
                        </span>
                      ) : null}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-300">
                    {planId === 'trial'
                      ? 'No credit card required'
                      : billing === 'yearly'
                        ? '/month · billed yearly'
                        : '/month · billed monthly'}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                      )}
                      <span className={feature.included ? 'text-slate-100' : 'text-slate-500'}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={loading || isCurrent}
                  onClick={() => void handlePlanClick(planId)}
                  className={cn(
                    'mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60',
                    planId === 'pro' &&
                      'border border-emerald-400 bg-emerald-500 text-emerald-950 hover:bg-emerald-400 hover:text-emerald-950',
                    planId === 'plus' &&
                      'border border-violet-400 bg-violet-500 text-white hover:bg-violet-400',
                    planId === 'trial' &&
                      'border border-white/20 bg-white/10 text-white hover:bg-white/20',
                  )}
                >
                  {isCurrent ? 'Current plan' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-14">
          <h3 className="text-center text-2xl font-semibold text-white">Why upgrade from Trial?</h3>
          <p className="mt-2 text-center text-slate-300">Key advantages of paid plans over the free trial</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {UPGRADE_HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/12 bg-white/8 p-5 shadow-lg shadow-slate-900/30"
              >
                <h4 className="font-semibold text-white">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {variant === 'landing' ? (
          <p className="mt-10 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-violet-300 hover:underline">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

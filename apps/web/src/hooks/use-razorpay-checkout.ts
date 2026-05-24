import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { BillingInterval, PlanId } from '@/lib/plans';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

const SCRIPT_ID = 'razorpay-checkout-js';
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function parseApiError(err: unknown, fallback: string): string {
  const ax = err as {
    message?: string;
    response?: { data?: { error?: { message?: string } } };
  };
  return ax.response?.data?.error?.message ?? ax.message ?? fallback;
}

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadRazorpayScript().catch(() => undefined);
  }, []);

  const checkout = useCallback(
    async (args: {
      plan: Exclude<PlanId, 'trial'>;
      billing: BillingInterval;
      prefill?: { name?: string; email?: string; contact?: string };
      onSuccess: (payload: RazorpaySuccess) => void | Promise<void>;
      onDismiss?: () => void;
    }) => {
      setLoading(true);
      try {
        await loadRazorpayScript();
        let orderRes;
        try {
          orderRes = await api.post('/billing/create-order', {
            plan: args.plan,
            billing: args.billing,
          });
        } catch (err) {
          throw new Error(parseApiError(err, 'Could not start payment'));
        }
        const data = orderRes.data?.data ?? orderRes.data;
        const orderId = data.order_id as string;
        const amount = data.amount as number;
        const currency = data.currency as string;
        const keyId = (data.key_id as string) || import.meta.env.VITE_RAZORPAY_KEY_ID;

        if (!window.Razorpay || !keyId) {
          throw new Error('Razorpay is not available');
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay!({
            key: keyId,
            amount,
            currency,
            name: 'Softdigit Consulting',
            description: `${args.plan.toUpperCase()} plan (${args.billing})`,
            order_id: orderId,
            prefill: args.prefill,
            theme: { color: '#4338ca' },
            handler: async (response: RazorpaySuccess) => {
              try {
                await api.post('/billing/verify-payment', response);
                await args.onSuccess(response);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => {
                args.onDismiss?.();
                reject(new Error('Payment cancelled'));
              },
            },
          });
          rzp.on('payment.failed', (resp: { error?: { description?: string } }) => {
            reject(new Error(resp?.error?.description ?? 'Payment failed'));
          });
          rzp.open();
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { checkout, loading };
}

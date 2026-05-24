import type { PlanId } from '@/lib/plans';

/** Razorpay Payment Link (rzp.io) for hosted checkout — optional alternative to Orders API modal. */
export function razorpayPaymentLink(plan: Exclude<PlanId, 'trial'>): string | null {
  const raw =
    plan === 'pro'
      ? import.meta.env.VITE_RAZORPAY_PRO_PAYMENT_LINK
      : import.meta.env.VITE_RAZORPAY_PLUS_PAYMENT_LINK;
  const url = raw?.trim();
  return url && url.startsWith('http') ? url : null;
}

export function hasRazorpayPaymentLinks(): boolean {
  return Boolean(razorpayPaymentLink('pro') || razorpayPaymentLink('plus'));
}

export function openRazorpayPaymentLink(plan: Exclude<PlanId, 'trial'>): boolean {
  const url = razorpayPaymentLink(plan);
  if (!url) return false;
  window.location.assign(url);
  return true;
}

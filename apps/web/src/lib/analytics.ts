import { useCookieConsentStore } from '@/store/cookieConsentStore';

type AnalyticsParams = Record<string, unknown>;

/**
 * Fire a GA4 (gtag) event. Mirrors GoogleAnalyticsManager's privacy model:
 * events are only sent once the visitor has granted functional cookie consent.
 * Undefined params are dropped so we never send empty keys.
 */
export function trackEvent(event: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined') return;

  const functionalEnabled = useCookieConsentStore.getState().preferences.functional;
  if (!functionalEnabled) return;

  const gtag = window.gtag;
  if (typeof gtag !== 'function') return;

  const clean: AnalyticsParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') clean[key] = value;
  }

  gtag('event', event, clean);
}

/**
 * Derive a meaningful conversion event from a marketing CTA href.
 * Keeps call sites simple — they only supply a `location` for context.
 */
export function trackCtaClick(href: string, location: string, label?: string): void {
  const base = { location, label };

  if (href.startsWith('/signup')) {
    const query = new URLSearchParams(href.split('?')[1] ?? '');
    trackEvent('signup_click', {
      ...base,
      plan: query.get('plan') ?? 'trial',
      billing: query.get('billing') ?? undefined,
    });
    return;
  }

  if (href.startsWith('/login')) {
    trackEvent('login_click', base);
    return;
  }

  if (href.startsWith('#pricing')) {
    trackEvent('pricing_view_click', base);
    return;
  }

  trackEvent('cta_click', { ...base, href });
}

import { useCookieConsentStore } from '@/store/cookieConsentStore';

type AnalyticsParams = Record<string, unknown>;

const SENSITIVE_PARAM = /(?:email|name|phone|address|token|secret|password|user.?id|customer.?id|company.?id|shop.?id)/i;

/**
 * Fire a GA4 (gtag) event. Mirrors GoogleAnalyticsManager's privacy model:
 * events are only sent once the visitor has granted analytics cookie consent.
 * PII-shaped keys and unsupported values are excluded from the payload.
 */
export function trackEvent(event: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined') return;

  const analyticsEnabled = useCookieConsentStore.getState().preferences.analytics;
  if (!analyticsEnabled) return;

  const gtag = window.gtag;
  if (typeof gtag !== 'function') return;

  if (!/^[a-z][a-z0-9_]{0,39}$/.test(event)) return;

  const clean: AnalyticsParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_PARAM.test(key)) continue;
    if (
      typeof value === 'string' &&
      value !== '' &&
      value.length <= 100
    ) {
      clean[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === 'boolean') {
      clean[key] = value;
    }
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

  let path: string;
  try {
    path = new URL(href, window.location.origin).pathname;
  } catch {
    path = '';
  }
  trackEvent('cta_click', { ...base, href: path });
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackCtaClick, trackEvent } from './analytics';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

describe('analytics consent and event data', () => {
  const gtag = vi.fn();

  beforeEach(() => {
    gtag.mockReset();
    window.gtag = gtag;
    useCookieConsentStore.setState({
      preferences: {
        essential: true,
        functional: true,
        analytics: false,
        decided: true,
        savedAt: null,
      },
    });
  });

  it('does not send events without analytics consent', () => {
    trackEvent('pricing_plan_click', { plan: 'pro' });

    expect(gtag).not.toHaveBeenCalled();
  });

  it('filters personal, unsupported, and oversized event parameters', () => {
    useCookieConsentStore.setState((state) => ({
      preferences: { ...state.preferences, analytics: true },
    }));

    trackEvent('pricing_plan_click', {
      plan: 'pro',
      email: 'person@example.com',
      customer_id: 'customer-1',
      extra: { unexpected: true },
      long_value: 'x'.repeat(101),
      empty: '',
    });

    expect(gtag).toHaveBeenCalledWith('event', 'pricing_plan_click', { plan: 'pro' });
  });

  it('does not include query strings or fragments in generic CTA events', () => {
    useCookieConsentStore.setState((state) => ({
      preferences: { ...state.preferences, analytics: true },
    }));

    trackCtaClick('/catalog?token=private#results', 'header', 'Browse');

    expect(gtag).toHaveBeenCalledWith('event', 'cta_click', {
      location: 'header',
      label: 'Browse',
      href: '/catalog',
    });
  });
});

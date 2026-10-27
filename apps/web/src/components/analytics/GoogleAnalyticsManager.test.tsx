import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GoogleAnalyticsManager } from './GoogleAnalyticsManager';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

describe('GoogleAnalyticsManager', () => {
  afterEach(() => {
    cleanup();
    document.getElementById('google-analytics-script')?.remove();
    window.dataLayer = undefined;
    window.gtag = undefined;
    useCookieConsentStore.setState((state) => ({
      preferences: { ...state.preferences, analytics: false },
    }));
  });

  it('does not load Google Analytics without analytics consent', () => {
    render(
      <MemoryRouter initialEntries={['/catalog?email=private@example.com#details']}>
        <GoogleAnalyticsManager />
      </MemoryRouter>,
    );

    expect(document.getElementById('google-analytics-script')).toBeNull();
    expect(window.gtag).toBeUndefined();
  });

  it('loads analytics only after opt-in and omits query and fragment data from page views', async () => {
    useCookieConsentStore.setState((state) => ({
      preferences: { ...state.preferences, analytics: true },
    }));

    render(
      <MemoryRouter initialEntries={['/catalog?email=private@example.com#details']}>
        <GoogleAnalyticsManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.getElementById('google-analytics-script')).not.toBeNull();
      expect(window.dataLayer?.some((entry) => {
        const [type, event, params] = entry as [string, string, { page_location?: string }];
        return type === 'event' && event === 'page_view' && params.page_location === `${window.location.origin}/catalog`;
      })).toBe(true);
    });

    act(() => {
      useCookieConsentStore.setState((state) => ({
        preferences: { ...state.preferences, analytics: false },
      }));
    });

    await waitFor(() => {
      expect(document.getElementById('google-analytics-script')).toBeNull();
      expect(window.gtag).toBeUndefined();
    });
  });
});

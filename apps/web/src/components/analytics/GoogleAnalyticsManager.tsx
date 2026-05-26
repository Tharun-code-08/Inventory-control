import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

const GOOGLE_ANALYTICS_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim() || 'G-TPNZ5BVY8F';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag() {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  return window.gtag;
}

function consentState(functionalEnabled: boolean) {
  return {
    analytics_storage: functionalEnabled ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  } as const;
}

export function GoogleAnalyticsManager() {
  const functionalEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const location = useLocation();
  const lastPageViewRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const pageKey = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search],
  );

  useEffect(() => {
    if (!GOOGLE_ANALYTICS_ID) return;

    const gtag = ensureGtag();
    if (!gtag) return;

    if (!functionalEnabled) {
      lastPageViewRef.current = null;
      gtag('consent', 'update', consentState(false));
      setReady(false);
      return;
    }

    gtag('consent', 'update', consentState(true));
    setReady(true);
  }, [functionalEnabled]);

  useEffect(() => {
    if (!GOOGLE_ANALYTICS_ID || !functionalEnabled || !ready) return;
    const gtag = ensureGtag();
    if (!gtag) return;
    if (lastPageViewRef.current === pageKey) return;
    lastPageViewRef.current = pageKey;
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pageKey,
      send_to: GOOGLE_ANALYTICS_ID,
    });
  }, [functionalEnabled, pageKey, ready]);

  return null;
}

export default GoogleAnalyticsManager;

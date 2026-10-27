import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

const GOOGLE_ANALYTICS_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim() || 'G-TPNZ5BVY8F';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag() {
  if (typeof window === 'undefined') return null;
  const dataLayer = (window.dataLayer ??= []);
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      dataLayer.push(args);
    };
  return window.gtag;
}

function removeGtag() {
  document.getElementById('google-analytics-script')?.remove();
  window.gtag = undefined;
  window.dataLayer = undefined;
}

export function GoogleAnalyticsManager() {
  const analyticsEnabled = useCookieConsentStore((state) => state.preferences.analytics);
  const location = useLocation();
  const lastPageViewRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const pageKey = useMemo(() => location.pathname, [location.pathname]);

  useEffect(() => {
    if (!GOOGLE_ANALYTICS_ID) return;

    if (!analyticsEnabled) {
      removeGtag();
      lastPageViewRef.current = null;
      setReady(false);
      return;
    }

    const gtag = ensureGtag();
    if (!gtag) return;

    if (!document.getElementById('google-analytics-script')) {
      const script = document.createElement('script');
      script.id = 'google-analytics-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`;
      document.head.appendChild(script);
      gtag('js', new Date());
      gtag('config', GOOGLE_ANALYTICS_ID, { send_page_view: false });
    }

    setReady(true);
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!GOOGLE_ANALYTICS_ID || !analyticsEnabled || !ready) return;
    const gtag = ensureGtag();
    if (!gtag) return;
    if (lastPageViewRef.current === pageKey) return;
    lastPageViewRef.current = pageKey;
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: `${window.location.origin}${pageKey}`,
      page_path: pageKey,
      send_to: GOOGLE_ANALYTICS_ID,
    });
  }, [analyticsEnabled, pageKey, ready]);

  return null;
}

export default GoogleAnalyticsManager;

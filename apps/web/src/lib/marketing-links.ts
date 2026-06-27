/**
 * The production apex (softdigitconsulting.com) is a MARKETING-ONLY domain in
 * AppRoutes — it renders just the landing page and redirects every other path
 * (incl. /login, /signup) back to "/". The actual auth/app pages live on the
 * app subdomain. So on that apex we must point auth links at the app origin;
 * on every other host (staging, app subdomain, localhost) the routes exist
 * same-origin, so relative links work as-is.
 */
const APP_ORIGIN = import.meta.env.VITE_APP_URL?.trim() || 'https://app.softdigitconsulting.com';

/** Hosts that serve the marketing-only landing page (must hop to the app origin). */
const MARKETING_ONLY_HOSTS = ['softdigitconsulting.com', 'www.softdigitconsulting.com'];

/** App routes that do NOT exist on the marketing-only apex. */
const APP_AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

function isAppAuthPath(href: string): boolean {
  return APP_AUTH_PATHS.some((p) => href === p || href.startsWith(`${p}?`) || href.startsWith(`${p}/`));
}

/**
 * Rewrite an app-auth path to the app origin when we're on the marketing-only
 * apex; otherwise return it unchanged. Non-auth and already-absolute hrefs pass
 * through untouched.
 */
export function resolveAuthHref(href: string): string {
  if (typeof window === 'undefined') return href;
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (!isAppAuthPath(href)) return href;
  if (MARKETING_ONLY_HOSTS.includes(window.location.hostname)) {
    return `${APP_ORIGIN}${href}`;
  }
  return href;
}

import {
  deleteBrowserCookie,
  readBrowserCookie,
  writeBrowserCookie,
} from '@/lib/browser-cookies';

export const COOKIE_CONSENT_COOKIE_NAME = 'cookie_consent';
export const ORG_COOKIE_NAME = 'org_id';
export const SESSION_COOKIE_NAME = 'session_id';
export const CSRF_COOKIE_NAME = 'csrf_token';
export const REMEMBER_ME_COOKIE_NAME = 'remember_me';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsentPreferences = {
  essential: true;
  functional: boolean;
  decided: boolean;
  savedAt: string | null;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsentPreferences = {
  essential: true,
  functional: false,
  decided: false,
  savedAt: null,
};

export function parseCookieConsent(raw: string | null | undefined): CookieConsentPreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences>;
    return {
      essential: true,
      functional: Boolean(parsed.functional),
      decided: Boolean(parsed.decided),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsentPreferences {
  return parseCookieConsent(readBrowserCookie(COOKIE_CONSENT_COOKIE_NAME)) ?? DEFAULT_COOKIE_CONSENT;
}

export function writeCookieConsent(preferences: CookieConsentPreferences) {
  writeBrowserCookie(COOKIE_CONSENT_COOKIE_NAME, JSON.stringify(preferences), {
    path: '/',
    maxAgeSeconds: ONE_YEAR_SECONDS,
    sameSite: 'Lax',
  });
}

export function currentFunctionalConsent() {
  return readCookieConsent().functional;
}

export function readPreferredOrgId() {
  return readBrowserCookie(ORG_COOKIE_NAME);
}

export function writePreferredOrgId(orgId: string) {
  if (!orgId) return;
  writeBrowserCookie(ORG_COOKIE_NAME, orgId, {
    path: '/',
    maxAgeSeconds: ONE_YEAR_SECONDS,
    sameSite: 'Lax',
  });
}

export function clearPreferredOrgId() {
  deleteBrowserCookie(ORG_COOKIE_NAME, '/');
}

export function clearAnalyticsCookies() {
  if (typeof document === 'undefined') return;
  const analyticsCookieNames = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter(Boolean)
    .map((name) => decodeURIComponent(name))
    .filter(
      (name) =>
        name === '_ga' ||
        name === '_gid' ||
        name.startsWith('_ga_') ||
        name.startsWith('_gat'),
    );

  for (const cookieName of analyticsCookieNames) {
    deleteBrowserCookie(cookieName, '/');
  }
}

export function syncPreferredOrgId(orgId: string | null | undefined, functionalEnabled: boolean) {
  if (!functionalEnabled || !orgId) {
    clearPreferredOrgId();
    return;
  }
  writePreferredOrgId(orgId);
}

export function resolvePreferredOrgId(
  availableShopIds: readonly string[],
  userShopId?: string | null,
  explicitShopId?: string | null,
) {
  if (userShopId) return userShopId;
  if (explicitShopId) return explicitShopId;
  const preferred = readPreferredOrgId();
  if (preferred && availableShopIds.includes(preferred)) {
    return preferred;
  }
  return availableShopIds[0] ?? '';
}

export function nextCookieConsent(functional: boolean): CookieConsentPreferences {
  return {
    essential: true,
    functional,
    decided: true,
    savedAt: new Date().toISOString(),
  };
}

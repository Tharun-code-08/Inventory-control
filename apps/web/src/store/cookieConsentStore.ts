import { create } from 'zustand';
import { api } from '@/api/client';
import {
  clearAnalyticsCookies,
  clearPreferredOrgId,
  DEFAULT_COOKIE_CONSENT,
  nextCookieConsent,
  readCookieConsent,
  type CookieConsentPreferences,
  writeCookieConsent,
} from '@/lib/cookie-consent';

type CookieConsentState = {
  preferences: CookieConsentPreferences;
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
  acceptAll: () => Promise<void>;
  acceptNecessaryOnly: () => Promise<void>;
  savePreferences: (functional: boolean, analytics: boolean) => Promise<void>;
  syncFromCookies: () => void;
};

async function clearFunctionalCookiesOnServer() {
  try {
    await api.post('/auth/cookies/functional/clear');
  } catch (error) {
    console.error('Failed to clear functional cookies after consent was revoked', error);
  }
}

async function applyConsentSideEffects(functionalEnabled: boolean, analyticsEnabled: boolean) {
  if (!functionalEnabled) {
    clearPreferredOrgId();
    await clearFunctionalCookiesOnServer();
  }
  if (!analyticsEnabled) clearAnalyticsCookies();
}

export const useCookieConsentStore = create<CookieConsentState>()((set) => ({
  preferences: readCookieConsent(),
  preferencesOpen: false,
  setPreferencesOpen: (open) => set({ preferencesOpen: open }),
  acceptAll: async () => {
    const next = nextCookieConsent(true, true);
    writeCookieConsent(next);
    set({ preferences: next, preferencesOpen: false });
  },
  acceptNecessaryOnly: async () => {
    const next = nextCookieConsent(false, false);
    writeCookieConsent(next);
    set({ preferences: next, preferencesOpen: false });
    await applyConsentSideEffects(false, false);
  },
  savePreferences: async (functional, analytics) => {
    const next = nextCookieConsent(functional, analytics);
    writeCookieConsent(next);
    set({ preferences: next, preferencesOpen: false });
    await applyConsentSideEffects(functional, analytics);
  },
  syncFromCookies: () => {
    set({ preferences: readCookieConsent() ?? DEFAULT_COOKIE_CONSENT });
  },
}));

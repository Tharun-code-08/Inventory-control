import { create } from 'zustand';
import { api } from '@/api/client';
import {
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
  savePreferences: (functional: boolean) => Promise<void>;
  syncFromCookies: () => void;
};

async function clearFunctionalCookiesOnServer() {
  try {
    await api.post('/auth/cookies/functional/clear');
  } catch {
    /* best effort */
  }
}

async function applyFunctionalConsentSideEffects(functionalEnabled: boolean) {
  if (functionalEnabled) return;
  clearPreferredOrgId();
  await clearFunctionalCookiesOnServer();
}

export const useCookieConsentStore = create<CookieConsentState>()((set) => ({
  preferences: readCookieConsent(),
  preferencesOpen: false,
  setPreferencesOpen: (open) => set({ preferencesOpen: open }),
  acceptAll: async () => {
    const next = nextCookieConsent(true);
    writeCookieConsent(next);
    set({ preferences: next, preferencesOpen: false });
  },
  acceptNecessaryOnly: async () => {
    const next = nextCookieConsent(false);
    writeCookieConsent(next);
    set({ preferences: next, preferencesOpen: false });
    await applyFunctionalConsentSideEffects(false);
  },
  savePreferences: async (functional) => {
    const next = nextCookieConsent(functional);
    writeCookieConsent(next);
    set({ preferences: next, preferencesOpen: false });
    await applyFunctionalConsentSideEffects(functional);
  },
  syncFromCookies: () => {
    set({ preferences: readCookieConsent() ?? DEFAULT_COOKIE_CONSENT });
  },
}));

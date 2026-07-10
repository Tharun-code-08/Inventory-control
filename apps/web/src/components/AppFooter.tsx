import { BRAND } from '@/lib/brand';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

export function AppFooter() {
  const openPreferences = useCookieConsentStore((state) => state.setPreferencesOpen);

  return (
    <footer className="mt-auto border-t border-border/90 bg-card/80 px-4 py-3 text-center text-xs text-muted-foreground dark:border-slate-800 dark:bg-slate-950/80 dark:text-muted-foreground sm:px-6">
      <span className="font-medium text-muted-foreground dark:text-slate-300">{BRAND.productName}</span>
      {' · '}
      {BRAND.poweredBy}
      {' · '}
      <button type="button" className="font-medium hover:underline" onClick={() => openPreferences(true)}>
        Cookie Preferences
      </button>
    </footer>
  );
}

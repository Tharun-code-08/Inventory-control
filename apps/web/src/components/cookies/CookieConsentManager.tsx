import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

function CookiePreferencesDialog() {
  const { preferences, preferencesOpen, setPreferencesOpen, savePreferences } = useCookieConsentStore();
  const [functionalEnabled, setFunctionalEnabled] = useState(preferences.functional);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferencesOpen) {
      setFunctionalEnabled(preferences.functional);
    }
  }, [preferences.functional, preferencesOpen]);

  const cookieRows = useMemo(
    () => [
      {
        category: 'Essential',
        enabled: true,
        description: 'Required for secure sign-in, CSRF protection, and saving your consent choice.',
        cookies: ['session_id', 'csrf_token', 'cookie_consent'],
      },
      {
        category: 'Functional',
        enabled: functionalEnabled,
        description:
          'Used for convenience features like remembering a trusted browser, keeping your active workspace selection, and measuring site usage with Google Analytics.',
        cookies: ['remember_me', 'org_id', '_ga', '_gid', '_ga_*'],
      },
    ],
    [functionalEnabled],
  );

  return (
    <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            Essential cookies keep the app secure. Functional cookies are optional and can be
            turned on if you want convenience features and Google Analytics measurement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {cookieRows.map((row) => (
            <div key={row.category} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{row.category}</p>
                  <p className="text-sm text-slate-600">{row.description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {row.cookies.map((cookieName) => (
                      <code
                        key={cookieName}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        {cookieName}
                      </code>
                    ))}
                  </div>
                </div>
                {row.category === 'Essential' ? (
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Always on
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {functionalEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={functionalEnabled}
                      onCheckedChange={setFunctionalEnabled}
                      aria-label="Enable functional cookies"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setPreferencesOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={async () => {
              setSaving(true);
              try {
                await savePreferences(functionalEnabled);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CookieConsentManager() {
  const {
    preferences,
    setPreferencesOpen,
    acceptAll,
    acceptNecessaryOnly,
    syncFromCookies,
  } = useCookieConsentStore();
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [acceptingNecessary, setAcceptingNecessary] = useState(false);

  useEffect(() => {
    syncFromCookies();
  }, [syncFromCookies]);

  return (
    <>
      {!preferences.decided ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4 sm:px-6">
          <div className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#101010] text-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]">
            <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_240px] md:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Cookie notice
                  </p>
                  <h2 className="max-w-xl text-3xl font-semibold leading-tight text-white">
                    Before you dig in, a quick heads up.
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300">
                    We use essential cookies to keep your session secure and optional functional
                    cookies to remember your browser, active workspace, and Google Analytics
                    measurement preferences.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="rounded-xl bg-white text-slate-950 hover:bg-slate-200"
                    disabled={acceptingAll || acceptingNecessary}
                    onClick={async () => {
                      setAcceptingAll(true);
                      try {
                        await acceptAll();
                      } finally {
                        setAcceptingAll(false);
                      }
                    }}
                  >
                    {acceptingAll ? 'Saving...' : 'Accept all'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-slate-700 bg-transparent text-white hover:bg-slate-900"
                    disabled={acceptingAll || acceptingNecessary}
                    onClick={() => setPreferencesOpen(true)}
                  >
                    Customise
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-slate-700 bg-transparent text-white hover:bg-slate-900"
                    disabled={acceptingAll || acceptingNecessary}
                    onClick={async () => {
                      setAcceptingNecessary(true);
                      try {
                        await acceptNecessaryOnly();
                      } finally {
                        setAcceptingNecessary(false);
                      }
                    }}
                  >
                    {acceptingNecessary ? 'Saving...' : 'Necessary only'}
                  </Button>
                </div>
              </div>
              <div className="relative hidden min-h-[180px] overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_35%,transparent_36%),radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_16%,transparent_17%)] md:flex md:items-center md:justify-center">
                <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_center,transparent_0,transparent_34%,rgba(255,255,255,0.06)_35%,transparent_36%,transparent_64%,rgba(255,255,255,0.04)_65%,transparent_66%)]" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <ShieldCheck className="h-6 w-6 text-slate-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CookiePreferencesDialog />
    </>
  );
}

export default CookieConsentManager;

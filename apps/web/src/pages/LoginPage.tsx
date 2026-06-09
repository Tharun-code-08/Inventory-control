import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api } from '@/api/client';
import { AuthStepIndicator } from '@/components/auth/AuthStepIndicator';
import { Reveal } from '@/components/motion';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';
import { useCookieConsentStore } from '@/store/cookieConsentStore';
import { animalAvatarForUser } from '@/lib/profile-avatar';
import { BRAND } from '@/lib/brand';
import { dashboardHomePath } from '@/lib/roles';

type LoginPayload =
  | {
      accessToken: string;
      user: unknown;
    }
  | {
      mfaRequired: true;
      challengeToken: string;
      email: string;
      expiresAt: string;
      availableMethods: readonly string[];
      allowRememberDevice?: boolean;
      attemptsRemaining?: number;
    };

export function LoginPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [challengeExpiry, setChallengeExpiry] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [err, setErr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarSplash, setShowAvatarSplash] = useState(false);
  const [splashAvatar, setSplashAvatar] = useState(animalAvatarForUser(null));
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!functionalCookiesEnabled) {
      setRememberDevice(false);
    }
  }, [functionalCookiesEnabled]);

  const steps = [
    { id: 'credentials', label: 'Credentials' },
    { id: 'mfa', label: 'Verify' },
  ];

  async function finalizeSignIn(payload: unknown) {
    await initializeSessionFromAuthResponse(payload, queryClient);
    const signedInUser = useAuthStore.getState().user;
    setSplashAvatar(animalAvatarForUser(signedInUser));
    setShowAvatarSplash(true);
    window.setTimeout(() => {
      nav(dashboardHomePath(signedInUser?.role));
    }, 1000);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const payload = (res.data?.data ?? res.data) as LoginPayload;
      if ('mfaRequired' in payload && payload.mfaRequired) {
        setChallengeToken(payload.challengeToken);
        setChallengeExpiry(payload.expiresAt);
        setAttemptsRemaining(payload.attemptsRemaining ?? null);
        setStep('mfa');
        setOtpCode('');
        setBackupCode('');
        setUseBackupCode(false);
        setRememberDevice(Boolean(payload.allowRememberDevice ?? true) && functionalCookiesEnabled);
        return;
      }
      await finalizeSignIn(res.data);
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Login failed.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');

    try {
      const res = await api.post('/auth/mfa/login/verify', {
        challengeToken,
        code: useBackupCode ? undefined : otpCode.trim(),
        backupCode: useBackupCode ? backupCode.trim() : undefined,
        rememberDevice: useBackupCode ? false : functionalCookiesEnabled && rememberDevice,
      });
      await finalizeSignIn(res.data);
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Could not verify your authenticator step.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(99,102,241,0.2),transparent_36%),radial-gradient(circle_at_84%_4%,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_50%,#f1f5f9_100%)]">
      <Link
        to="/"
        className="group absolute left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-slate-900/5 transition hover:-translate-x-0.5 hover:bg-slate-50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:left-6 sm:top-6"
        aria-label="Back to home page"
      >
        <ArrowLeft className="h-4 w-4 text-slate-600 transition group-hover:text-slate-900" />
        Back to home
      </Link>

      {showAvatarSplash ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_70%_90%,rgba(56,189,248,0.22),transparent_40%),rgba(2,6,23,0.94)]">
          <div className="relative flex min-w-[280px] max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/20 bg-white/10 px-8 py-8 text-center shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-300/40 blur-2xl" />
            <div className="pointer-events-none absolute -left-6 bottom-4 h-16 w-16 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${splashAvatar.bgClass}`}>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              <span role="img" aria-label={`${splashAvatar.kind} avatar`} className="text-5xl">
                {splashAvatar.emoji}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Preparing your workspace</p>
              <p className="text-xs text-slate-200/90">Syncing access, roles, and secure session state...</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Please wait</p>
          </div>
        </div>
      ) : null}

      <div aria-hidden className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-slate-400/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden overflow-hidden rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-10 text-white shadow-[0_30px_70px_rgba(15,23,42,0.38)] lg:block">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-slate-400/30 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 bottom-8 h-36 w-36 rounded-full bg-cyan-300/25 blur-2xl" />
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="h-3.5 w-3.5" />
              {BRAND.productName}
            </p>
            <h1 className="mt-7 text-4xl font-semibold leading-tight">
              Secure sign-in designed for high-trust inventory operations.
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/80">
              Use your password first, then confirm access with your authenticator app or a backup
              code before Retail IMS opens your workspace.
            </p>
            <div className="mt-10 grid max-w-md gap-3 text-sm">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                Password plus authenticator verification
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                Single-use backup code fallback
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                Session issued only after MFA succeeds
              </div>
            </div>
          </section>

          <Reveal as="section" className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.16)] backdrop-blur sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-muted blur-2xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-8 bottom-10 h-24 w-24 rounded-full bg-cyan-100 blur-2xl" aria-hidden="true" />

            <AuthStepIndicator steps={steps} current={step} />

            <div className="mb-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                {step === 'credentials' ? <Zap className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {step === 'credentials' ? 'Welcome back' : 'MFA verification'}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                {step === 'credentials' ? BRAND.loginTitle : 'Verify your sign-in'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {step === 'credentials'
                  ? 'Use your account credentials to continue.'
                  : useBackupCode
                    ? `Use one of your one-time backup codes for ${email}.`
                    : `Enter the 6-digit code from your authenticator app for ${email}.`}
              </p>
            </div>

            {step === 'credentials' ? (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="username"
                      className="h-12 rounded-xl bg-slate-50 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="h-12 rounded-xl bg-slate-50 pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                {err ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                  </div>
                ) : null}

                <Button className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-950" type="submit" disabled={isSubmitting || showAvatarSplash}>
                  {isSubmitting ? 'Signing in...' : 'Continue to secure sign-in'}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  New organisation?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Create account with email verification
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={onVerifyMfa} className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  {!useBackupCode ? (
                    <>
                      <div className="mb-4 text-center">
                        <p className="text-sm font-medium text-slate-700">Authenticator code</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Challenge expires at {new Date(challengeExpiry).toLocaleTimeString()}.
                        </p>
                        {attemptsRemaining ? (
                          <p className="mt-1 text-xs font-medium text-slate-600">
                            {attemptsRemaining} attempt(s) before the challenge locks.
                          </p>
                        ) : null}
                      </div>
                      <OtpCodeInput value={otpCode} onChange={setOtpCode} hasError={!!err} autoFocus />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="backup-code">Backup code</Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="backup-code"
                          value={backupCode}
                          onChange={(event) => setBackupCode(event.target.value.toUpperCase())}
                          placeholder="ABCD-EFGH"
                          className="h-12 rounded-xl bg-white pl-10 uppercase tracking-[0.18em]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {!useBackupCode ? (
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      disabled={!functionalCookiesEnabled}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">Remember this device for 7 days</span>
                      <span className="block text-xs text-slate-500">
                        {functionalCookiesEnabled
                          ? 'Skip the authenticator step on this browser for the next 7 days.'
                          : 'Enable functional cookies in Cookie Preferences to use this convenience feature.'}
                      </span>
                    </span>
                  </label>
                ) : null}

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      setUseBackupCode((current) => !current);
                      setErr('');
                      setRememberDevice(false);
                    }}
                  >
                    {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code instead'}
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => {
                      setStep('credentials');
                      setErr('');
                      setChallengeToken('');
                      setOtpCode('');
                      setBackupCode('');
                      setAttemptsRemaining(null);
                      setRememberDevice(true);
                    }}
                  >
                    Back
                  </button>
                </div>

                {err ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                  </div>
                ) : null}

                <Button className="h-12 w-full rounded-xl" type="submit" disabled={isSubmitting || showAvatarSplash}>
                  {isSubmitting ? 'Verifying...' : 'Verify and sign in'}
                </Button>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

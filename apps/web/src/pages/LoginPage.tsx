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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <Link
        to="/"
        className="group absolute left-4 top-4 z-50 inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition hover:bg-white hover:shadow-md hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:left-6 sm:top-6"
        aria-label="Back to home page"
      >
        <ArrowLeft className="h-4 w-4 text-slate-500 transition group-hover:text-slate-700" />
        Back
      </Link>

      {showAvatarSplash ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative flex min-w-[300px] max-w-sm flex-col items-center gap-6 rounded-2xl border border-slate-200/20 bg-white/95 backdrop-blur px-8 py-8 text-center shadow-2xl">
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${splashAvatar.bgClass} shadow-lg`}>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
              <span role="img" aria-label={`${splashAvatar.kind} avatar`} className="text-5xl">
                {splashAvatar.emoji}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">Preparing your workspace</p>
              <p className="text-sm text-slate-600">Syncing access, roles, and secure session state...</p>
            </div>
            <div className="w-full space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              </div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Please wait</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden overflow-hidden rounded-2xl border border-slate-200/40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 bottom-4 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />

            <div className="relative space-y-8">
              <div className="space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {BRAND.productName}
                </p>
                <h1 className="text-5xl font-bold leading-tight tracking-tight">
                  Secure access to your inventory system
                </h1>
                <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                  Enterprise-grade security with multi-factor authentication to protect your business data and operations.
                </p>
              </div>

              <div className="space-y-3 pt-8">
                <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 transition hover:bg-white/10 hover:border-white/20">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Two-factor authentication</p>
                    <p className="text-sm text-slate-400">Password + authenticator app verification</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 transition hover:bg-white/10 hover:border-white/20">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Backup codes</p>
                    <p className="text-sm text-slate-400">One-time recovery codes for emergency access</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 transition hover:bg-white/10 hover:border-white/20">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Trusted devices</p>
                    <p className="text-sm text-slate-400">Skip MFA on recognized browsers for 7 days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 pt-8 border-t border-white/10">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Trusted by inventory managers worldwide</p>
            </div>
          </section>

          <Reveal as="section" className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white/98 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-100 blur-3xl opacity-40" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-12 bottom-4 h-32 w-32 rounded-full bg-purple-100 blur-3xl opacity-40" aria-hidden="true" />

            <AuthStepIndicator steps={steps} current={step} />

            <div className="mb-10 space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                {step === 'credentials' ? <Zap className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {step === 'credentials' ? 'Welcome back' : 'Verify your identity'}
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                {step === 'credentials' ? BRAND.loginTitle : 'Secure verification'}
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                {step === 'credentials'
                  ? 'Enter your credentials to access your inventory system.'
                  : useBackupCode
                    ? `Enter a backup code for ${email}`
                    : `Enter the 6-digit code from your authenticator app for ${email}`}
              </p>
            </div>

            {step === 'credentials' ? (
              <form onSubmit={onSubmit} className="relative space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="username"
                      placeholder="you@company.com"
                      className="h-12 rounded-lg bg-slate-50/50 border border-slate-200/60 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-900">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-12 rounded-lg bg-slate-50/50 border border-slate-200/60 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition">
                    Forgot password?
                  </Link>
                </div>

                {err ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                        <span className="text-red-600 font-bold">!</span>
                      </div>
                    </div>
                    <p>{err}</p>
                  </div>
                ) : null}

                <Button className="relative h-12 w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 transition-all disabled:opacity-70 disabled:shadow-none" type="submit" disabled={isSubmitting || showAvatarSplash}>
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign in securely'
                  )}
                </Button>

                <p className="text-center text-sm text-slate-600">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition">
                    Create one now
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={onVerifyMfa} className="relative space-y-6">
                <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-6">
                  {!useBackupCode ? (
                    <div className="space-y-5">
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-semibold text-slate-900">Enter your authenticator code</p>
                        <p className="text-xs text-slate-500">
                          Code expires at <span className="font-medium text-slate-700">{new Date(challengeExpiry).toLocaleTimeString()}</span>
                        </p>
                        {attemptsRemaining ? (
                          <p className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                          </p>
                        ) : null}
                      </div>
                      <OtpCodeInput value={otpCode} onChange={setOtpCode} hasError={!!err} autoFocus />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label htmlFor="backup-code" className="text-sm font-semibold text-slate-900">
                        Backup code
                      </Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="backup-code"
                          value={backupCode}
                          onChange={(event) => setBackupCode(event.target.value.toUpperCase())}
                          placeholder="XXXX-XXXX"
                          className="h-12 rounded-lg bg-white border border-slate-200/60 pl-12 pr-4 uppercase tracking-[0.18em] text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Enter one of your backup codes</p>
                    </div>
                  )}
                </div>

                {!useBackupCode ? (
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200/60 bg-white/50 px-4 py-3.5 cursor-pointer hover:bg-blue-50 transition group">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      disabled={!functionalCookiesEnabled}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-slate-900 group-hover:text-slate-950">Trust this device for 7 days</span>
                      <span className="block text-xs text-slate-600 mt-0.5">
                        {functionalCookiesEnabled
                          ? "You won't need to enter your authenticator code on this browser for 7 days."
                          : 'Enable functional cookies in preferences to use this feature.'}
                      </span>
                    </span>
                  </label>
                ) : null}

                {err ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                        <span className="text-red-600 font-bold">!</span>
                      </div>
                    </div>
                    <p>{err}</p>
                  </div>
                ) : null}

                <Button className="relative h-12 w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 transition-all disabled:opacity-70 disabled:shadow-none" type="submit" disabled={isSubmitting || showAvatarSplash}>
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify and sign in'
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
                    onClick={() => {
                      setUseBackupCode((current) => !current);
                      setErr('');
                      setRememberDevice(false);
                    }}
                  >
                    {useBackupCode ? 'Use authenticator instead' : 'Use backup code'}
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 transition"
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
                    ← Back
                  </button>
                </div>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

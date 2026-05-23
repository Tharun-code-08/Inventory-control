import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Eye,
  EyeOff,
  Factory,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { api } from '@/api/client';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';
import { animalAvatarForUser } from '@/lib/profile-avatar';
import { BRAND } from '@/lib/brand';

type Step = 'details' | 'verify';

function parseApiError(e: unknown, fallback: string): string {
  const ax = e as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  if (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error') {
    return 'Cannot reach API. Start the server with npm run dev from retail-ims.';
  }
  const msg = ax.response?.data?.error?.message;
  return msg ?? fallback;
}

export function SignupPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('details');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAvatarSplash, setShowAvatarSplash] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [plantName, setPlantName] = useState('Head Office');
  const [plantAddress, setPlantAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    setInfo('');
    try {
      await api.post('/auth/signup/request', {
        companyName,
        companyAddress: companyAddress || undefined,
        plantName,
        plantAddress: plantAddress || companyAddress,
        contactPerson,
        mobile,
        adminName,
        email,
        password,
        confirmPassword,
      });
      setInfo(`We sent a 6-digit code to ${email}. Check your inbox (from office@softdigitconsulting.com).`);
      setStep('verify');
    } catch (error: unknown) {
      setErr(parseApiError(error, 'Could not start registration'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    try {
      const res = await api.post('/auth/signup/verify', { email, otp: otp.trim() });
      await initializeSessionFromAuthResponse(res.data, queryClient);
      const signedInUser = useAuthStore.getState().user;
      setShowAvatarSplash(true);
      window.setTimeout(() => {
        nav(signedInUser?.role === 'ADMIN' ? '/dashboard' : '/products');
      }, 1000);
    } catch (error: unknown) {
      setErr(parseApiError(error, 'Verification failed'));
      setIsSubmitting(false);
    }
  }

  async function resendOtp() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    setInfo('');
    try {
      await api.post('/auth/signup/resend', { email });
      setInfo('A new verification code has been sent.');
    } catch (error: unknown) {
      setErr(parseApiError(error, 'Could not resend code'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(99,102,241,0.2),transparent_36%),radial-gradient(circle_at_84%_4%,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_50%,#f1f5f9_100%)]">
      {showAvatarSplash ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90">
          <div className="flex flex-col items-center gap-4 text-center text-white">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-300" />
            <p className="text-lg font-semibold">Setting up your organisation</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden overflow-hidden rounded-[2rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-900 p-10 text-white shadow-[0_30px_70px_rgba(15,23,42,0.38)] lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="h-3.5 w-3.5" />
              {BRAND.productName}
            </p>
            <h1 className="mt-7 text-4xl font-semibold leading-tight">
              Register your organisation and start with a guided setup.
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/80">
              Create your company profile, verify your work email with a one-time code, and launch
              inventory operations on a secure workspace.
            </p>
            <ul className="mt-10 space-y-3 text-sm">
              <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                Company and primary plant in one step
              </li>
              <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                Email OTP from office@softdigitconsulting.com
              </li>
              <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                Admin account with Getting Started checklist
              </li>
            </ul>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.16)] backdrop-blur sm:p-8">
            <div className="mb-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                <Zap className="h-3.5 w-3.5" />
                {step === 'details' ? 'Create account' : 'Verify email'}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                {step === 'details' ? 'Register your organisation' : 'Enter verification code'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {step === 'details'
                  ? 'You will receive a 6-digit code at your work email to confirm ownership.'
                  : `Code sent to ${email}`}
              </p>
            </div>

            {step === 'details' ? (
              <form onSubmit={requestOtp} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Organisation name *</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Registered address</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <textarea
                        className={`${inputClass} min-h-[72px] resize-y py-3`}
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="Optional — used on documents"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Primary plant / location *</label>
                    <div className="relative">
                      <Factory className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={inputClass} value={plantName} onChange={(e) => setPlantName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Plant address *</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className={inputClass}
                        value={plantAddress}
                        onChange={(e) => setPlantAddress(e.target.value)}
                        placeholder="Same as registered address if one site"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Contact person *</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={inputClass} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Mobile *</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={inputClass} value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Administrator name *</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={inputClass} value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Work email *</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        className={inputClass}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Password *</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={inputClass}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Confirm password *</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={inputClass}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {err ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="premium-button w-full rounded-xl py-2.5 font-medium text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending code…' : 'Send verification code'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">6-digit code</label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] text-slate-800 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>

                {info ? (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                    {info}
                  </div>
                ) : null}
                {err ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || otp.length !== 6}
                  className="premium-button w-full rounded-xl py-2.5 font-medium text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify and create workspace'}
                </button>

                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Resend code
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setOtp('');
                    setErr('');
                    setInfo('');
                  }}
                  className="w-full text-sm text-indigo-600 hover:underline"
                >
                  Edit organisation details
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                Sign in
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

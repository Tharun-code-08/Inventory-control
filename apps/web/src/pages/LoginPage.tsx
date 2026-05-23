import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles, Zap } from 'lucide-react';
import { api } from '@/api/client';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';
import { animalAvatarForUser } from '@/lib/profile-avatar';
import { BRAND } from '@/lib/brand';

export function LoginPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [errDetails, setErrDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarSplash, setShowAvatarSplash] = useState(false);
  const [splashAvatar, setSplashAvatar] = useState(animalAvatarForUser(null));
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    setErrDetails('');
    try {
      const res = await api.post('/auth/login', { email, password });
      await initializeSessionFromAuthResponse(res.data, queryClient);
      const signedInUser = useAuthStore.getState().user;
      const avatar = animalAvatarForUser(signedInUser);
      setSplashAvatar(avatar);
      setShowAvatarSplash(true);
      const role = signedInUser?.role;
      window.setTimeout(() => {
        nav(role === 'ADMIN' ? '/dashboard' : '/products');
      }, 1000);
    } catch (e: unknown) {
      const ax = e as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: { success?: boolean; error?: { message?: string; code?: string } } };
      };
      if (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error') {
        setErr('Cannot reach API. Is the server running on port 3000?');
        return;
      }
      const payload = ax.response?.data as
        | { error?: { message?: string; code?: string; details?: string } }
        | undefined;
      const apiErr = payload?.error;
      const code = apiErr?.code;
      const msg = apiErr?.message;
      const details = typeof apiErr?.details === 'string' ? apiErr.details : '';
      setErrDetails(details);
      const base =
        msg ??
        (ax.response?.status === 401
          ? 'Invalid email or password'
          : ax.response?.status === 502
            ? 'API server is not running. Start it with: npm run dev (from retail-ims folder).'
            : 'Login failed');
      const statusNote = ax.response?.status ? ` [${ax.response.status}]` : '';
      setErr(code && code !== 'HTTP_ERROR' ? `${base}${statusNote} (${code})` : `${base}${statusNote}`);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(99,102,241,0.2),transparent_36%),radial-gradient(circle_at_84%_4%,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_50%,#f1f5f9_100%)]">
      {showAvatarSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_70%_90%,rgba(56,189,248,0.22),transparent_40%),rgba(2,6,23,0.94)]">
          <div className="relative flex min-w-[280px] max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/20 bg-white/10 px-8 py-8 text-center shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-300/40 blur-2xl" />
            <div className="pointer-events-none absolute -left-6 bottom-4 h-16 w-16 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${splashAvatar.bgClass}`}>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              <span role="img" aria-label={`${splashAvatar.kind} avatar`} className="text-5xl">
                {splashAvatar.emoji}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Preparing your workspace</p>
              <p className="text-xs text-slate-200/90">Syncing access, roles, and dashboard state...</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Please wait</p>
          </div>
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden overflow-hidden rounded-[2rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-900 p-10 text-white shadow-[0_30px_70px_rgba(15,23,42,0.38)] lg:block">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-400/30 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 bottom-8 h-36 w-36 rounded-full bg-cyan-300/25 blur-2xl" />
          <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" />
            {BRAND.productName}
          </p>
          <h1 className="mt-7 text-4xl font-semibold leading-tight">
            Inventory command center for high-speed retail teams.
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/80">
            Track stock movement, monitor low inventory, and keep all your stores synced from one workspace.
          </p>
          <div className="mt-10 grid max-w-md gap-3 text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">Real-time stock visibility</div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">Fast issue and receipt workflows</div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">Clean reports and role-based access</div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-xl font-semibold">99.9%</p>
              <p className="text-xs text-white/70">Session uptime</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-xl font-semibold">24/7</p>
              <p className="text-xs text-white/70">Stock traceability</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-xl font-semibold">1.2s</p>
              <p className="text-xs text-white/70">Average actions</p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.16)] backdrop-blur sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-indigo-100 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 bottom-10 h-24 w-24 rounded-full bg-cyan-100 blur-2xl" />
          <div className="mb-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <Zap className="h-3.5 w-3.5" />
              Welcome back
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{BRAND.loginTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">Use your account credentials to continue.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {err && (
              <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="font-medium">{err}</div>
                {errDetails ? (
                  <details className="text-xs text-red-700/90">
                    <summary className="cursor-pointer select-none font-medium text-red-700">Command hints</summary>
                    <p className="mt-1 font-mono break-all">{errDetails}</p>
                  </details>
                ) : null}
              </div>
            )}
            <button
              className="premium-button w-full rounded-xl border-0 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={isSubmitting || showAvatarSplash}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-slate-500">
              New organisation?{' '}
              <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
                Create account with email verification
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
    </div>
  );
}

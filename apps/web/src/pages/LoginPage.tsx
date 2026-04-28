import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@retailims.com');
  const [password, setPassword] = useState('Admin@123');
  const [err, setErr] = useState('');
  const [errDetails, setErrDetails] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setErrDetails('');
    try {
      const res = await api.post('/auth/login', { email, password });
      await initializeSessionFromAuthResponse(res.data);
      const role = useAuthStore.getState().user?.role;
      nav(role === 'ADMIN' ? '/dashboard' : '/products');
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
      const apiErr = ax.response?.data?.error as
        | { message?: string; code?: string; details?: string }
        | undefined;
      const code = apiErr?.code;
      const msg = apiErr?.message;
      const details = typeof apiErr?.details === 'string' ? apiErr.details : '';
      setErrDetails(details);
      const base =
        msg ?? (ax.response?.status === 401 ? 'Invalid email or password' : 'Login failed');
      setErr(code && code !== 'HTTP_ERROR' ? `${base} (${code})` : base);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white shadow-2xl lg:block">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider">
            Retail IMS
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight">Manage inventory smarter, faster, and cleaner.</h1>
          <p className="mt-4 max-w-md text-sm text-white/80">
            Track stock movement, monitor low inventory, and keep all your stores synced from one workspace.
          </p>
          <div className="mt-10 grid max-w-md gap-3 text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Real-time stock visibility</div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Fast issue and receipt workflows</div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Clean reports and role-based access</div>
          </div>
        </section>

        <section className="card-surface rounded-3xl p-6 sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Sign in to Retail IMS</h2>
            <p className="mt-2 text-sm text-slate-600">Use your account credentials to continue.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
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
              className="w-full rounded-xl bg-slate-900 py-2.5 font-medium text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

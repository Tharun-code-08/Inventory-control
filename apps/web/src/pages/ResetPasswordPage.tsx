import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Link2, LockKeyhole } from 'lucide-react';
import { TurnstileField } from '@/components/TurnstileField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { portalGet, portalPost } from '@/lib/portal-api';
import { dashboardHomePath } from '@/lib/roles';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';

type ResetPreview = {
  email: string;
  expiresAt: string;
};

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    if (!token) {
      setError('Missing password reset token.');
      setState('error');
      return;
    }

    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const data = await portalGet<ResetPreview>('/auth/password-reset/link', { token });
        if (cancelled) return;
        setPreview(data);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Reset link is invalid or expired.'));
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (siteKey && !turnstileToken) {
      setError('Complete the captcha and try again.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const payload = await portalPost('/auth/password-reset/link/complete', {
        token,
        newPassword,
        turnstileToken: turnstileToken || undefined,
      });
      await initializeSessionFromAuthResponse(payload, queryClient);
      nav(dashboardHomePath(useAuthStore.getState().user?.role));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not reset the password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-white">SoftdigitIMS</span>
            <span className="text-[11px] text-slate-300">Magic link reset</span>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8 text-white shadow-xl lg:block">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-300">SoftdigitIMS</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Set a new password with your secure link.</h1>
          <p className="mt-4 max-w-md text-sm text-white/80">
            This link works once, expires in 10 minutes, and revokes all existing sessions after
            the reset is completed.
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Single-use magic link</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Only hashed tokens are stored on the server</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Automatic sign-in with a fresh session after reset</div>
          </div>
        </section>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === 'loading' ? <p className="text-sm text-slate-600">Validating reset link...</p> : null}

            {state === 'error' ? (
              <>
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
                <p className="text-xs text-slate-500">
                  Need another email? <Link to="/forgot-password" className="text-primary hover:underline">Request a new reset link</Link>.
                </p>
              </>
            ) : null}

            {state === 'ready' && preview ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium">{preview.email}</p>
                  <p className="mt-1">This link expires at {new Date(preview.expiresAt).toLocaleString()}.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pl-10"
                      placeholder="At least 10 characters"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <TurnstileField siteKey={siteKey} onToken={setTurnstileToken} />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Resetting password...' : 'Reset password and sign in'}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default ResetPasswordPage;

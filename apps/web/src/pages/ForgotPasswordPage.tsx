import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, Link2, Mail } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Reveal } from '@/components/motion';
import { TurnstileField } from '@/components/TurnstileField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { portalPost } from '@/lib/portal-api';
import { dashboardHomePath } from '@/lib/roles';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';

type RequestMethod = 'otp' | 'magic_link';

export function ForgotPasswordPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedMethod, setRequestedMethod] = useState<RequestMethod | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

  async function requestReset(method: RequestMethod) {
    if (isRequesting) return;
    setIsRequesting(true);
    setError('');
    setMessage('');
    try {
      await portalPost('/auth/password-reset/request', {
        email,
        method,
      });
      setRequestedMethod(method);
      setMessage(
        method === 'otp'
          ? 'If the email exists, a 6-digit reset code has been sent. Enter it below with your new password.'
          : 'If the email exists, a reset link has been sent. Check your inbox and spam folder.',
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not start the password reset flow.'));
    } finally {
      setIsRequesting(false);
    }
  }

  async function submitOtpReset(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingOtp) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (siteKey && !turnstileToken) {
      setError('Complete the captcha and try again.');
      return;
    }

    setIsSubmittingOtp(true);
    setError('');
    try {
      const payload = await portalPost('/auth/password-reset/otp/complete', {
        email,
        otp: otp.trim(),
        newPassword,
        turnstileToken: turnstileToken || undefined,
      });
      await initializeSessionFromAuthResponse(payload, queryClient);
      nav(dashboardHomePath(useAuthStore.getState().user?.role));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not reset password with the code.'));
    } finally {
      setIsSubmittingOtp(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-indigo-950 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandLogo
            size={36}
            subtitle="Account recovery"
            titleClassName="text-white"
            subtitleClassName="text-indigo-200"
          />
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-indigo-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-900 p-8 text-white shadow-xl lg:block">
          <p className="text-sm uppercase tracking-[0.22em] text-indigo-200">Retail IMS</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Recover access securely.</h1>
          <p className="mt-4 max-w-md text-sm text-white/80">
            Choose a one-time code or a magic link. Every reset expires in 10 minutes, older reset
            requests stop working automatically, and all sessions are revoked after reset.
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Email OTP with 5-attempt protection</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Magic link stored as a hashed token only</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Automatic sign-in after successful password reset</div>
          </div>
        </section>

        <Reveal>
        <Card className="border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              <p className="text-xs text-slate-500">
                We always show the same response, even if the email is not registered.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                disabled={isRequesting || !email.trim()}
                onClick={() => requestReset('otp')}
              >
                <KeyRound className="h-4 w-4" />
                {isRequesting && requestedMethod === 'otp' ? 'Sending code...' : 'Send OTP'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                disabled={isRequesting || !email.trim()}
                onClick={() => requestReset('magic_link')}
              >
                <Link2 className="h-4 w-4" />
                {isRequesting && requestedMethod === 'magic_link' ? 'Sending link...' : 'Send magic link'}
              </Button>
            </div>

            {message ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {requestedMethod === 'otp' ? (
              <form className="space-y-4 border-t border-slate-200 pt-5" onSubmit={submitOtpReset}>
                <div className="space-y-2">
                  <Label htmlFor="otp">Reset code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 10 characters"
                  />
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

                <TurnstileField siteKey={siteKey} onToken={setTurnstileToken} />

                <Button type="submit" className="w-full" disabled={isSubmittingOtp}>
                  {isSubmittingOtp ? 'Resetting password...' : 'Reset password and sign in'}
                </Button>
              </form>
            ) : null}

            <p className="text-center text-sm text-slate-500">
              Remembered it?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
        </Reveal>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;

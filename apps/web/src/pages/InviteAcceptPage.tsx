import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { portalGet, portalPost } from '@/lib/portal-api';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { getApiErrorMessage } from '@/lib/api-error';
import { TurnstileField } from '@/components/TurnstileField';

type InvitePreview = {
  email: string;
  name?: string | null;
  roleName: string;
  shopName?: string | null;
  companyName?: string | null;
  inviterName?: string | null;
  expiresAt: string;
};

export function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [isSubmitting, setSubmitting] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token.');
      setState('error');
      return;
    }

    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const data = await portalGet<InvitePreview>('/auth/invite', { token });
        if (cancelled) return;
        setPreview(data);
        setName(data.name ?? '');
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Invitation is invalid or expired.'));
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!preview) return;

    setSubmitting(true);
    try {
      const payload = await portalPost('/auth/invite/accept', {
        token,
        password,
        name: name.trim() || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      await initializeSessionFromAuthResponse(payload, queryClient);
      toast.success('Invitation accepted.');
      nav('/products');
    } catch (err) {
      // The captcha token was spent by this attempt; get a fresh one.
      setTurnstileResetKey((n) => n + 1);
      toast.error(getApiErrorMessage(err, 'Failed to accept invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-slate-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-white">SoftdigitIMS</span>
          <span className="text-[11px] text-slate-300">User invitation</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Accept your invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === 'loading' && <p className="text-sm text-muted-foreground">Loading invitation…</p>}
            {state === 'error' && (
              <>
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Need a new link? Ask your administrator to resend your invitation.
                </p>
              </>
            )}

            {state === 'ready' && preview && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="rounded-md bg-muted p-3 text-sm text-foreground">
                  <p className="font-medium">{preview.companyName ?? 'SoftdigitIMS'}</p>
                  <p className="mt-1">Role: {preview.roleName}</p>
                  {preview.shopName && <p>Shop: {preview.shopName}</p>}
                  <p>Email: {preview.email}</p>
                  {preview.inviterName && <p>Invited by: {preview.inviterName}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <TurnstileField siteKey={siteKey} onToken={setTurnstileToken} resetKey={turnstileResetKey} />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account…' : 'Accept and continue'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Already have an account? <Link to="/login" className="text-primary">Sign in</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default InviteAcceptPage;

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { portalGet, portalPost } from '@/lib/portal-api';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { getApiErrorMessage } from '@/lib/api-error';

type InvitePreview = {
  email: string;
  name?: string | null;
  roleName: string;
  shopName?: string | null;
  companyName?: string | null;
  inviterName?: string | null;
  expiresAt: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string | undefined;
      reset?: (id?: string) => void;
    };
  }
}

function TurnstileField({
  siteKey,
  onToken,
}: {
  siteKey?: string;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => {
          if (!cancelled) onToken(token);
        },
        'error-callback': () => {
          if (!cancelled) onToken('');
        },
        'expired-callback': () => {
          if (!cancelled) onToken('');
        },
      }) as string | undefined;
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(widgetIdRef.current);
        }
      };
    }

    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(widgetIdRef.current);
        }
      };
    }

    const existing = document.getElementById(scriptId);
    existing?.addEventListener('load', renderWidget);
    return () => {
      cancelled = true;
      existing?.removeEventListener('load', renderWidget);
      if (widgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(widgetIdRef.current);
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return <div className="mt-1" ref={containerRef} />;
}

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
      toast.error(getApiErrorMessage(err, 'Failed to accept invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-indigo-950 px-4 py-4 text-white">
        <BrandLogo
          size={36}
          subtitle="User invitation"
          titleClassName="text-white"
          subtitleClassName="text-indigo-200"
        />
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Accept your invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === 'loading' && <p className="text-sm text-slate-600">Loading invitation…</p>}
            {state === 'error' && (
              <>
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-slate-500">
                  Need a new link? Ask your administrator to resend your invitation.
                </p>
              </>
            )}

            {state === 'ready' && preview && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium">{preview.companyName ?? 'Retail IMS'}</p>
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

                <TurnstileField siteKey={siteKey} onToken={setTurnstileToken} />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account…' : 'Accept and continue'}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Already have an account? <Link to="/login" className="text-indigo-600">Sign in</Link>
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

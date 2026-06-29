import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { portalGet } from '@/lib/portal-api';

type ConfirmResult = {
  success: boolean;
  alreadyDeleted?: boolean;
  supplierName: string;
  supplierCode: string;
  message: string;
};

export function SupplierDeleteConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Missing confirmation token.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await portalGet<ConfirmResult>('/suppliers/confirm-deletion', { token });
        if (cancelled) return;
        setResult(data);
        setState('success');
      } catch (e) {
        if (cancelled) return;
        setState('error');
        setError(e instanceof Error ? e.message : 'Confirmation failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-slate-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-white">SoftdigitIMS</span>
          <span className="text-[11px] text-slate-300">Supplier deletion confirmation</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <p className="text-muted-foreground">Confirming deletion…</p>
            </>
          )}

          {state === 'success' && result && (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-xl font-semibold text-foreground">
                {result.alreadyDeleted ? 'Already deleted' : 'Deleted successfully'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">{result.supplierName}</span>
                <span className="text-muted-foreground"> ({result.supplierCode})</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">{result.message}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                RFQs, purchase orders, and other records keep their historical supplier name.
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="mx-auto mb-4 h-14 w-14 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground">Confirmation failed</h1>
              <p className="mt-3 text-sm text-destructive">{error}</p>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                Request a new link from the Suppliers page.
              </p>
            </>
          )}

          <Link
            to="/login"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            Go to SoftdigitIMS
          </Link>
        </div>
      </main>
    </div>
  );
}

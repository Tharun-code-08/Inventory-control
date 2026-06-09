import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { portalGet } from '@/lib/portal-api';
import { BrandLogo } from '@/components/BrandLogo';

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
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 px-4 py-4 text-white">
        <BrandLogo
          size={36}
          subtitle="Supplier deletion confirmation"
          titleClassName="text-white"
          subtitleClassName="text-slate-300"
        />
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <p className="text-slate-600">Confirming deletion…</p>
            </>
          )}

          {state === 'success' && result && (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
              <h1 className="text-xl font-semibold text-slate-900">
                {result.alreadyDeleted ? 'Already deleted' : 'Deleted successfully'}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">{result.supplierName}</span>
                <span className="text-slate-400"> ({result.supplierCode})</span>
              </p>
              <p className="mt-4 text-sm text-slate-500">{result.message}</p>
              <p className="mt-4 text-xs text-slate-400">
                RFQs, purchase orders, and other records keep their historical supplier name.
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="mx-auto mb-4 h-14 w-14 text-destructive" />
              <h1 className="text-xl font-semibold text-slate-900">Confirmation failed</h1>
              <p className="mt-3 text-sm text-destructive">{error}</p>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldAlert className="h-4 w-4" />
                Request a new link from the Suppliers page.
              </p>
            </>
          )}

          <Link
            to="/login"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            Go to Retail IMS
          </Link>
        </div>
      </main>
    </div>
  );
}

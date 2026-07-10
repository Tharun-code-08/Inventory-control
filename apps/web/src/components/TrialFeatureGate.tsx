import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SubscriptionSnapshot } from '@/lib/plans';

export type TrialFeature =
  | 'purchaseOrders'
  | 'reports'
  | 'rfqs'
  | 'contracts'
  | 'salesOrders'
  | 'salesQuotations'
  | 'invoices'
  | 'payments'
  | 'supplierPortal';

type Props = {
  subscription?: SubscriptionSnapshot | null;
  feature: TrialFeature;
  children: React.ReactNode;
};

function featureAllowed(sub: SubscriptionSnapshot | null | undefined, feature: TrialFeature) {
  if (!sub) return true;
  if (sub.plan !== 'TRIAL') return true;
  const flags = sub.features ?? {};
  // If backend omitted the specific flag, default to false for trial.
  return Boolean((flags as Record<string, boolean | undefined>)[feature]);
}

export function TrialFeatureGate({ subscription, feature, children }: Props) {
  if (featureAllowed(subscription, feature)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Upgrade to access this feature</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This feature is not available on the trial. Subscribe to unlock it and keep all your existing data.
        </p>
        <Link
          to="/upgrade"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
        >
          Go to Upgrade
        </Link>
      </div>
    </div>
  );
}

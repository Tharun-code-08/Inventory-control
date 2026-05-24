import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SubscriptionSnapshot } from '@/lib/plans';

type Props = {
  subscription?: SubscriptionSnapshot | null;
};

export function TrialUpgradeBanner({ subscription }: Props) {
  if (!subscription || subscription.plan !== 'TRIAL') return null;
  const daysLeft =
    subscription.daysLeftInTrial != null
      ? `${subscription.daysLeftInTrial} day${subscription.daysLeftInTrial === 1 ? '' : 's'} left`
      : 'Trial active';

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-amber-900">Trial mode</div>
          <div className="text-amber-800/90">Subscribe to unlock all features. {daysLeft}.</div>
        </div>
        <Link
          to="/upgrade"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-amber-500 sm:mt-0"
        >
          Upgrade now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

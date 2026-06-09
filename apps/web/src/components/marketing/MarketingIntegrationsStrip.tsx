import type { MarketingIntegration } from '@/lib/marketing-content';
import { CreditCard, FileText, Mail, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const ICONS: Record<string, typeof CreditCard> = {
  razorpay: CreditCard,
  gst: Search,
  smtp: Mail,
  pdf: FileText,
};

type MarketingIntegrationsStripProps = {
  integrations: MarketingIntegration[];
  className?: string;
};

function IntegrationTile({ item }: { item: MarketingIntegration }) {
  const Icon = ICONS[item.id] ?? FileText;
  return (
    <div className="inline-flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">{item.description}</p>
      </div>
    </div>
  );
}

export function MarketingIntegrationsStrip({ integrations, className }: MarketingIntegrationsStripProps) {
  const row = integrations;

  return (
    <div className={cn('overflow-hidden', className)}>
      <p className="mb-4 text-center text-sm font-medium text-slate-500">
        Integrates with the tools your retail stack needs
      </p>
      <div className="marketing-marquee integrations-marquee">
        <div className="marketing-marquee-track flex w-max gap-4">
          {[...row, ...row].map((item, i) => (
            <IntegrationTile key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
      <div className="marketing-marquee-static hidden flex-wrap justify-center gap-4">
        {row.map((item) => (
          <IntegrationTile key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

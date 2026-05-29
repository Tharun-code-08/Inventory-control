import { MARKETING_BADGES } from '@/lib/marketing-content';

function BadgePill({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
      {label}
    </span>
  );
}

export function MarketingBadgeStrip() {
  const row = MARKETING_BADGES;

  return (
    <section aria-label="Platform capabilities" className="border-y border-slate-200/80 bg-white py-6">
      <div className="marketing-marquee overflow-hidden">
        <div className="marketing-marquee-track flex w-max gap-3 px-4">
          {[...row, ...row].map((label, i) => (
            <BadgePill key={`${label}-${i}`} label={label} />
          ))}
        </div>
      </div>
      {/* Reduced-motion fallback: static wrap */}
      <div className="marketing-marquee-static hidden flex-wrap justify-center gap-3 px-4">
        {row.map((label) => (
          <BadgePill key={label} label={label} />
        ))}
      </div>
    </section>
  );
}

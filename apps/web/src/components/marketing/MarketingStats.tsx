import { MARKETING_STATS, type MarketingStat } from '@/lib/marketing-content';
import { AnimatedNumber, Reveal } from '@/components/motion';
import { cn } from '@/lib/cn';

function StatValue({ stat }: { stat: MarketingStat }) {
  const isNumeric = typeof stat.value === 'number';
  return (
    <span
      className={cn(
        'font-bold tracking-tight text-slate-900',
        // Numbers get the bigger, hero treatment; word values stay one line.
        isNumeric ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
      )}
    >
      {stat.prefix}
      {isNumeric ? <AnimatedNumber value={stat.value as number} duration={900} /> : stat.display}
      {stat.suffix}
    </span>
  );
}

export function MarketingStats() {
  return (
    <section aria-label="Platform highlights" className="border-y border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{MARKETING_STATS.eyebrow}</p>
        </Reveal>
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {MARKETING_STATS.items.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={80 + index * 70}
              className="relative text-center lg:text-left lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-slate-200 lg:[&:not(:first-child)]:pl-6"
            >
              <dd>
                <StatValue stat={stat} />
              </dd>
              <dt className="mt-2">
                <span className="block text-sm font-semibold text-slate-900">{stat.label}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{stat.description}</span>
              </dt>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

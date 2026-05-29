import { MARKETING_CAPABILITIES } from '@/lib/marketing-content';
import { MarketingIntegrationsStrip } from './MarketingIntegrationsStrip';

export function MarketingCapabilitiesGrid() {
  const { eyebrow, title, largeCard, smallCards, integrations } = MARKETING_CAPABILITIES;

  return (
    <section id="ims" className="bg-slate-50 py-16 sm:py-20" aria-labelledby="capabilities-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
          <h2 id="capabilities-heading" className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">{largeCard.title}</h3>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{largeCard.body}</p>
        </div>

        <div className="mt-8">
          <MarketingIntegrationsStrip integrations={integrations} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {smallCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

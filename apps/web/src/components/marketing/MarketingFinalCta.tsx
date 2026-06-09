import { MARKETING_FINAL_CTA } from '@/lib/marketing-content';
import { Reveal } from '@/components/motion';
import { MarketingCtaLink } from './MarketingCtaLink';
import { MarketingImagePlaceholder } from './MarketingImagePlaceholder';

export function MarketingFinalCta() {
  const [primaryImage, secondaryImage] = MARKETING_FINAL_CTA.images;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 py-16 sm:py-20" aria-labelledby="final-cta-heading">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.12),transparent_50%)]" />

      {primaryImage ? (
        <div className="pointer-events-none absolute -right-8 top-8 hidden w-[42%] max-w-md rotate-3 md:block lg:-right-4 lg:top-6">
          <MarketingImagePlaceholder slot={primaryImage} className="shadow-2xl shadow-slate-950/30" aspectClassName="aspect-[4/3]" />
        </div>
      ) : null}
      {secondaryImage ? (
        <div className="pointer-events-none absolute bottom-4 left-[8%] hidden w-[22%] max-w-[180px] -rotate-6 lg:block">
          <MarketingImagePlaceholder slot={secondaryImage} className="shadow-xl shadow-slate-950/25" aspectClassName="aspect-[9/16]" />
        </div>
      ) : null}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-xl text-center lg:max-w-lg lg:text-left">
          <h2 id="final-cta-heading" className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {MARKETING_FINAL_CTA.title}
          </h2>
          <p className="mt-4 text-lg text-slate-200">{MARKETING_FINAL_CTA.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <MarketingCtaLink
              cta={MARKETING_FINAL_CTA.primaryCta}
              variant="secondary"
              className="border-0 bg-white text-slate-900 hover:bg-slate-100"
            />
            <MarketingCtaLink
              cta={MARKETING_FINAL_CTA.secondaryCta}
              variant="secondary"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

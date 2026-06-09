import { MARKETING_HERO } from '@/lib/marketing-content';
import { MarketingParallax, Reveal } from '@/components/motion';
import { MarketingCtaLink } from './MarketingCtaLink';
import { MarketingImagePlaceholder } from './MarketingImagePlaceholder';

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50" aria-labelledby="hero-heading">
      <div className="motion-marketing-hero-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(99_102_241/0.08),transparent_45%),radial-gradient(circle_at_80%_10%,rgb(56_189_248/0.06),transparent_40%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{MARKETING_HERO.eyebrow}</p>
          <h1 id="hero-heading" className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
            {MARKETING_HERO.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{MARKETING_HERO.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingCtaLink cta={MARKETING_HERO.primaryCta} variant="primary" className="px-6 py-3" />
            <MarketingCtaLink cta={MARKETING_HERO.secondaryCta} variant="secondary" className="px-6 py-3" />
          </div>
          <p className="mt-4 text-sm text-slate-500">{MARKETING_HERO.poweredBy}</p>
        </Reveal>
        <Reveal delay={120}>
          <MarketingParallax strength={18}>
            <MarketingImagePlaceholder slot={MARKETING_HERO.imageSlot} className="w-full" />
          </MarketingParallax>
        </Reveal>
      </div>
    </section>
  );
}

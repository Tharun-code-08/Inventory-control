import { CheckCircle2, FileCheck2, PackageCheck, Sparkles, TrendingUp } from 'lucide-react';
import { MARKETING_HERO } from '@/lib/marketing-content';
import { Reveal, Tilt3D } from '@/components/motion';
import { MarketingCtaLink } from './MarketingCtaLink';
import { ProductMockup } from './ProductMockup';

/** Splits the headline so a trailing clause can be rendered in animated gradient. */
function splitHeadline(title: string): [string, string] {
  const marker = ' from ';
  const idx = title.indexOf(marker);
  if (idx === -1) return [title, ''];
  return [title.slice(0, idx + 1), title.slice(idx + 1)];
}

export function MarketingHero() {
  const [headLead, headAccent] = splitHeadline(MARKETING_HERO.title);

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white"
      aria-labelledby="hero-heading"
    >
      {/* Animated gradient mesh + aurora + grid for layered depth */}
      <div className="mk-mesh pointer-events-none absolute inset-0" />
      <div className="mk-aurora pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(15_23_42/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:py-24">
        <Reveal>
          <span className="mk-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            {MARKETING_HERO.badge}
          </span>

          <h1
            id="hero-heading"
            className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]"
          >
            {headLead}
            {headAccent ? <span className="mk-gradient-text">{headAccent}</span> : null}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {MARKETING_HERO.body}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <MarketingCtaLink
              cta={MARKETING_HERO.primaryCta}
              variant="primary"
              location="hero"
              className="px-6 py-3 text-sm"
            />
            <MarketingCtaLink
              cta={MARKETING_HERO.secondaryCta}
              variant="secondary"
              location="hero"
              className="px-6 py-3 text-sm"
            />
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {MARKETING_HERO.highlights.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-slate-500">{MARKETING_HERO.poweredBy}</p>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative [perspective:1600px]">
            {/* Glow pad behind the device */}
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-primary/20 via-sky-300/20 to-emerald-200/10 blur-3xl" />

            <Tilt3D className="relative">
              {/* Browser chrome frame holding the generated dashboard */}
              <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_40px_90px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5">
                <ProductMockup variant="dashboard" title="Operations Dashboard" />
              </div>

              {/* Floating glass stat cards lifted toward the viewer in 3-D */}
              <div className="mk-glass mk-float mk-depth-2 absolute -left-6 bottom-10 hidden rounded-2xl px-4 py-3 sm:flex">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <PackageCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Stock in sync</p>
                    <p className="text-xs text-slate-500">Real-time across plants</p>
                  </div>
                </div>
              </div>

              <div className="mk-glass mk-float-slow mk-depth-3 absolute -right-5 -top-5 hidden rounded-2xl px-4 py-3 md:flex">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <TrendingUp className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">GST invoice sent</p>
                    <p className="text-xs text-slate-500">Payment tracked via Razorpay</p>
                  </div>
                </div>
              </div>

              <div className="mk-glass mk-float mk-depth-1 absolute -bottom-5 right-12 hidden rounded-2xl px-4 py-3 lg:flex">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
                    <FileCheck2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">PO approved</p>
                    <p className="text-xs text-slate-500">Goods receipt booked</p>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

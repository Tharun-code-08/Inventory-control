import { CheckCircle2, PackageCheck, Sparkles, TrendingUp } from 'lucide-react';
import { MARKETING_HERO } from '@/lib/marketing-content';
import { MarketingParallax, Reveal } from '@/components/motion';
import { MarketingCtaLink } from './MarketingCtaLink';
import { MarketingImagePlaceholder } from './MarketingImagePlaceholder';

export function MarketingHero() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50"
      aria-labelledby="hero-heading"
    >
      {/* Layered gradient mesh + subtle grid for depth */}
      <div className="motion-marketing-hero-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_-5%,rgb(99_102_241/0.10),transparent_45%),radial-gradient(circle_at_82%_8%,rgb(56_189_248/0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(15_23_42/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />

      <div className="relative mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-16">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden />
            {MARKETING_HERO.badge}
          </span>

          <h1
            id="hero-heading"
            className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
          >
            {MARKETING_HERO.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">{MARKETING_HERO.body}</p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <MarketingCtaLink cta={MARKETING_HERO.primaryCta} variant="primary" location="hero" className="px-5 py-2.5 text-sm" />
            <MarketingCtaLink cta={MARKETING_HERO.secondaryCta} variant="secondary" location="hero" className="px-5 py-2.5 text-sm" />
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {MARKETING_HERO.highlights.map((item) => (
              <li key={item} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-slate-500">{MARKETING_HERO.poweredBy}</p>
        </Reveal>

        <Reveal delay={120}>
          <MarketingParallax strength={16}>
            <div className="relative">
              {/* Glow behind the device frame */}
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/10 via-sky-200/20 to-transparent blur-2xl" />

              {/* Browser chrome frame */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-3 hidden truncate rounded-md bg-white px-3 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200 sm:block">
                    app.softdigitconsulting.com
                  </span>
                </div>
                <MarketingImagePlaceholder
                  slot={MARKETING_HERO.imageSlot}
                  className="rounded-none border-0 shadow-none"
                  aspectClassName="aspect-[16/10]"
                />
              </div>

              {/* Floating stat cards */}
              <div className="motion-marketing-float absolute -left-4 bottom-8 hidden rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:flex">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <PackageCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Stock in sync</p>
                    <p className="text-xs text-slate-500">Real-time across plants</p>
                  </div>
                </div>
              </div>

              <div className="motion-marketing-float-slow absolute -right-3 -top-4 hidden rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur md:flex">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">GST invoice sent</p>
                    <p className="text-xs text-slate-500">Payment tracked via Razorpay</p>
                  </div>
                </div>
              </div>
            </div>
          </MarketingParallax>
        </Reveal>
      </div>
    </section>
  );
}

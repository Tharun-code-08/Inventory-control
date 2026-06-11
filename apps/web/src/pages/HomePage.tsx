import { Link } from 'react-router-dom';
import { BRAND } from '@/lib/brand';
import { BrandLogo } from '@/components/BrandLogo';
import { PricingSection } from '@/components/PricingSection';
import { MarketingBadgeStrip } from '@/components/marketing/MarketingBadgeStrip';
import { MarketingCapabilitiesGrid } from '@/components/marketing/MarketingCapabilitiesGrid';
import { MarketingContactSection } from '@/components/marketing/MarketingContactSection';
import { MarketingDevicesSection } from '@/components/marketing/MarketingDevicesSection';
import { MarketingFeatureSection } from '@/components/marketing/MarketingFeatureSection';
import { MarketingFinalCta } from '@/components/marketing/MarketingFinalCta';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingHero } from '@/components/marketing/MarketingHero';
import { MARKETING_FEATURE_BLOCKS } from '@/lib/marketing-content';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
      >
        Skip to main content
      </a>

      <header className="border-b border-white/10 bg-[#030b2a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo
            size={32}
            title={BRAND.companyName}
            subtitle={BRAND.productName}
            titleClassName="text-slate-100"
            subtitleClassName="text-slate-400"
          />
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-5">
            <a
              href="#pricing"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline-block"
            >
              Pricing
            </a>
            <a
              href="#services"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline-block"
            >
              Services
            </a>
            <a
              href="#ims"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white md:inline-block"
            >
              {BRAND.productName}
            </a>
            <a
              href="#contact"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white lg:inline-block"
            >
              Contact
            </a>
            <Link
              to="/login"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {BRAND.loginTitle}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <MarketingHero />
        <MarketingBadgeStrip />
        <MarketingDevicesSection />
        {MARKETING_FEATURE_BLOCKS.map((block, index) => (
          <MarketingFeatureSection key={block.id} block={block} isFirst={index === 0} />
        ))}
        <MarketingCapabilitiesGrid />
        <PricingSection />
        <MarketingContactSection />
        <MarketingFinalCta />
      </main>

      <MarketingFooter />
    </div>
  );
}

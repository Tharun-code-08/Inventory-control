import { PricingSection } from '@/components/PricingSection';
import { MarketingBadgeStrip } from '@/components/marketing/MarketingBadgeStrip';
import { MarketingCapabilitiesGrid } from '@/components/marketing/MarketingCapabilitiesGrid';
import { MarketingContactSection } from '@/components/marketing/MarketingContactSection';
import { MarketingDevicesSection } from '@/components/marketing/MarketingDevicesSection';
import { MarketingFaq } from '@/components/marketing/MarketingFaq';
import { MarketingFeatureSection } from '@/components/marketing/MarketingFeatureSection';
import { MarketingFinalCta } from '@/components/marketing/MarketingFinalCta';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingHero } from '@/components/marketing/MarketingHero';
import { MarketingStats } from '@/components/marketing/MarketingStats';
import { MarketingWorkflow } from '@/components/marketing/MarketingWorkflow';
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

      <MarketingHeader />

      <main id="main" className="flex-1">
        <MarketingHero />
        <MarketingStats />
        <MarketingBadgeStrip />
        <MarketingWorkflow />
        <MarketingDevicesSection />
        {MARKETING_FEATURE_BLOCKS.map((block, index) => (
          <MarketingFeatureSection key={block.id} block={block} isFirst={index === 0} />
        ))}
        <MarketingCapabilitiesGrid />
        <PricingSection />
        <MarketingFaq />
        <MarketingContactSection />
        <MarketingFinalCta />
      </main>

      <MarketingFooter />
    </div>
  );
}

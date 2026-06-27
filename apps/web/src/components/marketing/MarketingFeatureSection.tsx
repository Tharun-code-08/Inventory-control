import { useState } from 'react';
import type { MarketingFeatureBlock } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/motion';
import { MarketingCtaLink } from './MarketingCtaLink';
import { MarketingImagePlaceholder } from './MarketingImagePlaceholder';

type MarketingFeatureSectionProps = {
  block: MarketingFeatureBlock;
  /** First block gets #features anchor */
  isFirst?: boolean;
};

export function MarketingFeatureSection({ block, isFirst }: MarketingFeatureSectionProps) {
  const [activeId, setActiveId] = useState(block.tabs[0]?.id ?? '');
  const activeTab = block.tabs.find((t) => t.id === activeId) ?? block.tabs[0];
  const reversed = Boolean(block.reversed);

  return (
    <section
      id={isFirst ? 'features' : undefined}
      className={cn('py-16 sm:py-20', reversed ? 'bg-slate-50' : 'bg-white')}
      aria-labelledby={`feature-${block.id}-heading`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <Reveal className={cn(reversed && 'lg:order-2')}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{block.eyebrow}</p>
          <h2 id={`feature-${block.id}-heading`} className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {block.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{block.body}</p>

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={`${block.eyebrow} views`}>
            {block.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeId === tab.id}
                aria-controls={`feature-panel-${block.id}-${tab.id}`}
                id={`feature-tab-${block.id}-${tab.id}`}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition',
                  activeId === tab.id
                    ? 'border-border bg-muted text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                )}
                onClick={() => setActiveId(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {block.cta ? (
            <div className="mt-8">
              <MarketingCtaLink cta={block.cta} variant="primary" location={`feature_${block.id}`} className="px-6 py-3" />
            </div>
          ) : null}
        </Reveal>

        <Reveal delay={100} className={cn(reversed && 'lg:order-1')}>
          {block.tabs.map((tab) => (
            <div
              key={tab.id}
              id={`feature-panel-${block.id}-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`feature-tab-${block.id}-${tab.id}`}
              hidden={activeId !== tab.id}
            >
              {activeId === tab.id ? (
                <div key={activeId} className="motion-fade-up">
                  <MarketingImagePlaceholder slot={tab.imageSlot} className="w-full" />
                </div>
              ) : null}
            </div>
          ))}
          {activeTab?.description ? (
            <p className="mt-3 text-sm text-slate-500">{activeTab.description}</p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

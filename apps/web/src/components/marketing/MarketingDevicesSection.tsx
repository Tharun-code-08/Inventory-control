import { useState } from 'react';
import { MARKETING_DEVICES } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/motion';
import { MarketingImagePlaceholder } from './MarketingImagePlaceholder';

export function MarketingDevicesSection() {
  const [activeId, setActiveId] = useState(MARKETING_DEVICES.tabs[0]?.id ?? 'web');
  const activeTab = MARKETING_DEVICES.tabs.find((t) => t.id === activeId) ?? MARKETING_DEVICES.tabs[0];

  return (
    <section className="bg-white py-16 sm:py-20" aria-labelledby="devices-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{MARKETING_DEVICES.eyebrow}</p>
          <h2 id="devices-heading" className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {MARKETING_DEVICES.title}
          </h2>
          <p className="mt-4 text-lg text-slate-600">{MARKETING_DEVICES.body}</p>
        </Reveal>

        <Reveal delay={80} className="mt-8 flex justify-center">
          <div role="tablist" aria-label="Device views" className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {MARKETING_DEVICES.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeId === tab.id}
                aria-controls={`devices-panel-${tab.id}`}
                id={`devices-tab-${tab.id}`}
                className={cn(
                  'rounded-full px-5 py-2 text-sm font-medium transition',
                  activeId === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                )}
                onClick={() => setActiveId(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120} className="mt-10">
          {MARKETING_DEVICES.tabs.map((tab) => (
            <div
              key={tab.id}
              id={`devices-panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`devices-tab-${tab.id}`}
              hidden={activeId !== tab.id}
              className="mx-auto max-w-4xl"
            >
              {activeId === tab.id ? (
                <div key={activeId} className="motion-fade-up">
                  <MarketingImagePlaceholder slot={tab.imageSlot} className="w-full" />
                </div>
              ) : null}
            </div>
          ))}
          {activeTab ? (
            <div className="sr-only" aria-live="polite">
              Showing {activeTab.label} view
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

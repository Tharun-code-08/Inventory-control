import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MARKETING_FAQ } from '@/lib/marketing-content';
import { Reveal } from '@/components/motion';
import { cn } from '@/lib/cn';

export function MarketingFaq() {
  const { eyebrow, title, body, items } = MARKETING_FAQ;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-16 bg-slate-50 py-12 sm:py-14" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 id="faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-slate-600">{body}</p>
        </Reveal>

        <Reveal delay={80} className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5"
                  >
                    <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300',
                        isOpen && 'rotate-180 text-primary',
                      )}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="px-4 pb-4 sm:px-5"
                >
                  <p className="text-xs leading-relaxed text-slate-600">{item.a}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

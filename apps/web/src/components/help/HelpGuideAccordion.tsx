import { useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import type { HelpGuide } from '@/lib/help-content';
import { cn } from '@/lib/cn';

type HelpGuideAccordionProps = {
  guides: HelpGuide[];
};

export function HelpGuideAccordion({ guides }: HelpGuideAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(guides[0]?.id ?? null);

  return (
    <section className="rounded-2xl border border-border/90 bg-card shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4 dark:border-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary dark:bg-slate-800/50 dark:text-slate-300">
          <Play className="h-4 w-4 fill-current" />
        </span>
        <h2 className="text-base font-semibold text-foreground dark:text-slate-100">Quick Start Guides</h2>
      </div>
      <div className="divide-y divide-border dark:divide-slate-800">
        {guides.map((guide) => {
          const isOpen = openId === guide.id;
          return (
            <div key={guide.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : guide.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-muted dark:hover:bg-slate-800/60"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium text-foreground dark:text-slate-100">{guide.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen && (
                <ol className="list-decimal space-y-2 border-t border-border bg-muted/60 px-8 py-4 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  {guide.steps.map((step) => (
                    <li key={step} className="pl-1 leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

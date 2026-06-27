import type { LucideIcon } from 'lucide-react';
import { ArrowRight, PackageCheck, ReceiptText, ShoppingCart, Wallet } from 'lucide-react';
import { MARKETING_WORKFLOW } from '@/lib/marketing-content';
import { Reveal } from '@/components/motion';

const STEP_ICONS: Record<string, LucideIcon> = {
  source: ShoppingCart,
  receive: PackageCheck,
  sell: ReceiptText,
  collect: Wallet,
};

export function MarketingWorkflow() {
  const { eyebrow, title, body, steps } = MARKETING_WORKFLOW;

  return (
    <section id="how-it-works" className="scroll-mt-16 bg-white py-12 sm:py-14" aria-labelledby="workflow-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 id="workflow-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-slate-600">{body}</p>
        </Reveal>

        <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.id] ?? ShoppingCart;
            const isLast = index === steps.length - 1;

            return (
              <Reveal key={step.id} delay={80 + index * 80} as="li" className="relative">
                <div className="group h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{step.step}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.body}</p>
                </div>

                {/* Connector arrow between steps (desktop only) */}
                {!isLast ? (
                  <span className="pointer-events-none absolute -right-3 top-12 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm lg:flex">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                ) : null}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

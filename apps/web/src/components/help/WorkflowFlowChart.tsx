import { ArrowDown, ArrowRight } from 'lucide-react';
import type { WorkflowDefinition } from '@/lib/help-content';
import { cn } from '@/lib/cn';

const accentStyles: Record<
  WorkflowDefinition['accent'],
  { node: string; connector: string; ring: string }
> = {
  blue: {
    node: 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100',
    connector: 'text-sky-400',
    ring: 'ring-sky-100 dark:ring-sky-900',
  },
  green: {
    node: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100',
    connector: 'text-emerald-400',
    ring: 'ring-emerald-100 dark:ring-emerald-900',
  },
  orange: {
    node: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100',
    connector: 'text-amber-400',
    ring: 'ring-amber-100 dark:ring-amber-900',
  },
  violet: {
    node: 'border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100',
    connector: 'text-violet-400',
    ring: 'ring-violet-100 dark:ring-violet-900',
  },
  teal: {
    node: 'border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100',
    connector: 'text-teal-400',
    ring: 'ring-teal-100 dark:ring-teal-900',
  },
};

type WorkflowFlowChartProps = {
  workflow: WorkflowDefinition;
};

export function WorkflowFlowChart({ workflow }: WorkflowFlowChartProps) {
  const styles = accentStyles[workflow.accent];

  return (
    <div className={cn('rounded-xl bg-muted/80 p-4 ring-1 dark:bg-slate-900/50', styles.ring)}>
      <p className="mb-4 text-center text-sm text-muted-foreground dark:text-muted-foreground">{workflow.summary}</p>
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-1">
        {workflow.steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center md:flex-row">
            <div
              className={cn(
                'w-full min-w-[9.5rem] rounded-xl border-2 px-4 py-3 text-center shadow-sm md:w-auto',
                styles.node,
              )}
            >
              <p className="text-sm font-semibold leading-tight">{step.label}</p>
              {step.hint && (
                <p className="mt-1 text-[11px] font-medium opacity-75">{step.hint}</p>
              )}
            </div>
            {index < workflow.steps.length - 1 && (
              <>
                <ArrowDown
                  className={cn('my-1 h-5 w-5 shrink-0 md:hidden', styles.connector)}
                  aria-hidden
                />
                <ArrowRight
                  className={cn('mx-1 hidden h-5 w-5 shrink-0 md:block', styles.connector)}
                  aria-hidden
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  CheckCircle2,
  GitBranch,
  Package,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WORKFLOW_DEFINITIONS, type WorkflowDefinition } from '@/lib/help-content';
import { WorkflowFlowChart } from '@/components/help/WorkflowFlowChart';
import { cn } from '@/lib/cn';

const workflowMeta: Record<
  WorkflowDefinition['id'],
  { icon: typeof ShoppingCart; border: string; iconBg: string }
> = {
  procurement: {
    icon: ShoppingCart,
    border: 'border-t-sky-500',
    iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  sales: {
    icon: Truck,
    border: 'border-t-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  inventory: {
    icon: Package,
    border: 'border-t-amber-500',
    iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  'supplier-onboarding': {
    icon: Store,
    border: 'border-t-violet-500',
    iconBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  approval: {
    icon: CheckCircle2,
    border: 'border-t-teal-500',
    iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
};

export function WorkflowCards() {
  const [active, setActive] = useState<WorkflowDefinition | null>(null);

  return (
    <>
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary dark:bg-slate-800/50 dark:text-slate-300">
              <GitBranch className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Workflow Diagrams
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Click any workflow to view the step-by-step diagram.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {WORKFLOW_DEFINITIONS.map((workflow) => {
            const meta = workflowMeta[workflow.id];
            const Icon = meta.icon;
            return (
              <button
                key={workflow.id}
                type="button"
                onClick={() => setActive(workflow)}
                className={cn(
                  'group flex flex-col items-center rounded-xl border border-slate-200/90 border-t-4 bg-white px-4 py-5 text-center shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600',
                  meta.border,
                )}
              >
                <span
                  className={cn(
                    'mb-3 flex h-12 w-12 items-center justify-center rounded-full transition group-hover:scale-105',
                    meta.iconBg,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {workflow.title}
                </span>
                <span className="mt-1 text-xs text-slate-500 group-hover:text-primary dark:text-slate-400 dark:group-hover:text-slate-300">
                  Click to view
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl border-slate-200 dark:border-slate-700">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.title}</DialogTitle>
                <DialogDescription>{active.summary}</DialogDescription>
              </DialogHeader>
              <WorkflowFlowChart workflow={active} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

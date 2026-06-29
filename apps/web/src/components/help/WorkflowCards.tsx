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
    iconBg: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 dark:bg-sky-950 dark:text-sky-300',
  },
  sales: {
    icon: Truck,
    border: 'border-t-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
  },
  inventory: {
    icon: Package,
    border: 'border-t-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-950 dark:text-amber-300',
  },
  'supplier-onboarding': {
    icon: Store,
    border: 'border-t-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 dark:bg-violet-950 dark:text-violet-300',
  },
  approval: {
    icon: CheckCircle2,
    border: 'border-t-teal-500',
    iconBg: 'bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 dark:bg-teal-950 dark:text-teal-300',
  },
};

export function WorkflowCards() {
  const [active, setActive] = useState<WorkflowDefinition | null>(null);

  return (
    <>
      <section className="rounded-2xl border border-border/90 bg-card shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-border px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary dark:bg-slate-800/50 dark:text-slate-300">
              <GitBranch className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground dark:text-slate-100">
                Workflow Diagrams
              </h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
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
                  'group flex flex-col items-center rounded-xl border border-border/90 border-t-4 bg-card px-4 py-5 text-center shadow-sm transition hover:border-border hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600',
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
                <span className="text-sm font-semibold text-foreground dark:text-slate-100">
                  {workflow.title}
                </span>
                <span className="mt-1 text-xs text-muted-foreground group-hover:text-primary dark:text-muted-foreground dark:group-hover:text-slate-300">
                  Click to view
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl border-border dark:border-slate-700">
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

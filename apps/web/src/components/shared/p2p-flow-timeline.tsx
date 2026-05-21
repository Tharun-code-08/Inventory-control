import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type P2PStep = {
  key: string;
  label: string;
  state: 'done' | 'active' | 'todo';
  helper?: string;
};

export function P2PFlowTimeline({ title = 'P2P flow', steps }: { title?: string; steps: P2PStep[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-5">
        {steps.map((step) => (
          <div
            key={step.key}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs',
              step.state === 'done' && 'border-emerald-200 bg-emerald-50/70',
              step.state === 'active' && 'border-blue-200 bg-blue-50/70',
              step.state === 'todo' && 'border-slate-200 bg-slate-50/40',
            )}
          >
            <div className="flex items-center gap-2">
              {step.state === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : step.state === 'active' ? (
                <Clock3 className="h-4 w-4 text-blue-600" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400" />
              )}
              <span className="font-medium">{step.label}</span>
            </div>
            {step.helper ? <p className="mt-1 text-[11px] text-muted-foreground">{step.helper}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ColumnFilterOption = {
  value: string;
  label: string;
};

type ColumnFilterProps = {
  label: string;
  filterLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: ColumnFilterOption[];
  allValue?: string;
  allLabel?: string;
  className?: string;
  active?: boolean;
};

export function ColumnFilter({
  label,
  filterLabel,
  value,
  onChange,
  options,
  allValue = '_all',
  allLabel = 'All',
  className,
  active,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const isActive = active ?? value !== allValue;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-[#eef2ff] hover:text-slate-800 dark:text-slate-400 dark:hover:bg-indigo-950/30 dark:hover:text-slate-200',
          (open || isActive) && 'selection-active',
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <ListFilter
          className={cn('h-3.5 w-3.5', (open || isActive) && 'selection-active-icon')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            {filterLabel ?? `Filter by ${label.charAt(0) + label.slice(1).toLowerCase()}`}
          </p>
          <Select
            value={value}
            onValueChange={(v) => {
              onChange(v);
              setOpen(false);
            }}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 text-sm dark:border-slate-600">
              <SelectValue placeholder={allLabel} />
            </SelectTrigger>
            <SelectContent className="z-[120]">
              <SelectItem value={allValue}>{allLabel}</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

type DateRangeColumnFilterProps = {
  label?: string;
  dateFrom?: string;
  dateTo?: string;
  onChange: (from?: string, to?: string) => void;
  className?: string;
};

export function DateRangeColumnFilter({
  label = 'DATE',
  dateFrom,
  dateTo,
  onChange,
  className,
}: DateRangeColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const isActive = Boolean(dateFrom || dateTo);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-[#eef2ff] hover:text-slate-800 dark:text-slate-400 dark:hover:bg-indigo-950/30 dark:hover:text-slate-200',
          (open || isActive) && 'selection-active',
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <ListFilter
          className={cn('h-3.5 w-3.5', (open || isActive) && 'selection-active-icon')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Filter by date range</p>
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
              From
              <input
                type="date"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                value={dateFrom ?? ''}
                onChange={(e) => onChange(e.target.value || undefined, dateTo)}
              />
            </label>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
              To
              <input
                type="date"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                value={dateTo ?? ''}
                onChange={(e) => onChange(dateFrom, e.target.value || undefined)}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                onClick={() => {
                  onChange(undefined, undefined);
                  setOpen(false);
                }}
              >
                Clear dates
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FilterableTableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=dialog])]:relative',
        className,
      )}
    >
      {children}
    </th>
  );
}

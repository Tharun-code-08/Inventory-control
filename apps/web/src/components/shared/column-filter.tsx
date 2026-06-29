import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ListFilter } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ColumnFilterOption = {
  value: string;
  label: string;
};

function useFilterPanelPosition(
  anchorRef: React.RefObject<HTMLButtonElement | null>,
  open: boolean,
) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const panelMaxHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < panelMaxHeight && rect.top > panelMaxHeight;

      setStyle({
        position: 'fixed',
        left: Math.min(rect.left, window.innerWidth - 260),
        top: openUpward ? rect.top - 8 : rect.bottom + 8,
        transform: openUpward ? 'translateY(-100%)' : undefined,
        zIndex: 9999,
        minWidth: Math.max(rect.width, 220),
        maxWidth: Math.min(320, window.innerWidth - 16),
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, open]);

  return style;
}

function FilterPopoverPanel({
  anchorRef,
  open,
  onClose,
  panelId,
  children,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  panelId: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const style = useFilterPanelPosition(anchorRef, open);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      style={style}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {children}
    </div>,
    document.body,
  );
}

function FilterTriggerButton({
  label,
  open,
  isActive,
  panelId,
  onClick,
  buttonRef,
}: {
  label: string;
  open: boolean;
  isActive: boolean;
  panelId: string;
  onClick: () => void;
  buttonRef: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-accent hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
        (open || isActive) && 'selection-active',
      )}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onClick}
    >
      <span>{label}</span>
      <ListFilter
        className={cn('h-3.5 w-3.5', (open || isActive) && 'selection-active-icon')}
        aria-hidden
      />
    </button>
  );
}

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const isActive = active ?? value !== allValue;

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={cn('inline-flex', className)}>
      <FilterTriggerButton
        label={label}
        open={open}
        isActive={isActive}
        panelId={panelId}
        buttonRef={buttonRef}
        onClick={() => setOpen((o) => !o)}
      />
      <FilterPopoverPanel
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        panelId={panelId}
      >
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          {filterLabel ?? `Filter by ${label.charAt(0) + label.slice(1).toLowerCase()}`}
        </p>
        <div className="max-h-60 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            className={cn(
              'flex w-full rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800',
              value === allValue && 'bg-accent font-medium text-foreground dark:bg-accent dark:text-accent-foreground',
            )}
            onClick={() => pick(allValue)}
          >
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'flex w-full rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800',
                value === opt.value &&
                  'bg-accent font-medium text-foreground dark:bg-accent dark:text-accent-foreground',
              )}
              onClick={() => pick(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterPopoverPanel>
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const isActive = Boolean(dateFrom || dateTo);

  return (
    <div className={cn('inline-flex', className)}>
      <FilterTriggerButton
        label={label}
        open={open}
        isActive={isActive}
        panelId={panelId}
        buttonRef={buttonRef}
        onClick={() => setOpen((o) => !o)}
      />
      <FilterPopoverPanel
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        panelId={panelId}
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
              className="text-xs font-medium text-primary hover:underline dark:text-primary"
              onClick={() => {
                onChange(undefined, undefined);
                setOpen(false);
              }}
            >
              Clear dates
            </button>
          )}
        </div>
      </FilterPopoverPanel>
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
        'h-11 px-4 text-left align-middle font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Label } from '@/components/ui/label';

/**
 * Standard section grouping for create / edit forms.
 * Renders a thin top hairline, an 11px uppercase title, optional hint,
 * and a content area with consistent vertical rhythm (space-y-3).
 *
 * Replaces the per-page ad-hoc `<div className="rounded-lg border bg-muted p-3">...`
 * pattern so density and alignment match across PO, GR, Invoice, etc.
 */
export function FormSection({
  title,
  hint,
  actions,
  children,
  className,
}: {
  title: string;
  hint?: string;
  /** Right-aligned controls inside the section header (e.g. an "Add line" button). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0', className)}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/**
 * Responsive grid for form fields. Defaults to 12px gaps. `cols` is the
 * desktop column count; mobile is always 1 column, tablet is half.
 */
export function FormGrid({
  cols = 3,
  className,
  children,
}: {
  cols?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  const colClass =
    cols === 1
      ? 'grid-cols-1'
      : cols === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : cols === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  return <div className={cn('grid gap-3', colClass, className)}>{children}</div>;
}

/**
 * Label-above-input wrapper with a fixed 10px error/hint slot to prevent
 * layout shift when validation messages appear.
 */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground/80">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      <div className="min-h-[14px] text-[11px] leading-tight">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : hint ? (
          <span className="text-muted-foreground/80">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

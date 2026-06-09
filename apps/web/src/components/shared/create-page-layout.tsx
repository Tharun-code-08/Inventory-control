import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type CreatePageLayoutProps = {
  title: string;
  description?: string;
  backTo: string;
  backLabel?: string;
  children: ReactNode;
  /** Right-side header actions (e.g. an "Export" or auxiliary button). */
  actions?: ReactNode;
  /**
   * When provided, renders a sticky footer bar inside the shell so the primary
   * Save / Save & Send actions stay reachable on long forms. Pages can keep
   * embedding their own footer for backwards-compat by leaving this undefined.
   */
  actionBar?: ReactNode;
  /** Constrain inner content (defaults to no extra cap; AppLayout already caps at 1400px). */
  maxContentWidth?: 'none' | 'narrow';
  className?: string;
};

export function CreatePageLayout({
  title,
  description,
  backTo,
  backLabel = 'Back',
  children,
  actions,
  actionBar,
  maxContentWidth = 'none',
  className,
}: CreatePageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('create-page-shell flex flex-col', className)}>
      <div className="flex-1 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <PageHeader title={title} description={description}>
          <div className="flex items-center gap-2">
            {actions}
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(backTo)}>
              {backLabel}
            </Button>
          </div>
        </PageHeader>
        <div
          className={cn(
            'space-y-4',
            maxContentWidth === 'narrow' && 'mx-auto w-full max-w-3xl',
          )}
        >
          {children}
        </div>
      </div>
      {actionBar && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-6">
          <div className="flex flex-wrap items-center justify-end gap-2">{actionBar}</div>
        </div>
      )}
    </div>
  );
}

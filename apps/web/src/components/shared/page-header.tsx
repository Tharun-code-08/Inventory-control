import { cn } from '@/lib/cn';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  breadcrumbs?: { label: string; href?: string }[];
  showBreadcrumbs?: boolean;
};

export function PageHeader({
  title,
  description,
  children,
  className,
  breadcrumbs,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  const { items, subtitle } = useBreadcrumbs();
  const resolvedItems = breadcrumbs ?? items;
  const resolvedDescription = description ?? subtitle;

  return (
    <div className={cn('mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {showBreadcrumbs && resolvedItems.length > 0 && (
          <Breadcrumbs items={resolvedItems} className="mb-1.5" />
        )}
        <h1 className="premium-title text-lg font-semibold sm:text-xl">{title}</h1>
        {resolvedDescription && (
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{resolvedDescription}</p>
        )}
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{children}</div>}
    </div>
  );
}

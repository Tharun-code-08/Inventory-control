import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useIsMobileMotion } from '@/hooks/use-is-mobile-motion';
import type { BreadcrumbItem } from '@/lib/breadcrumbs';

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const isMobile = useIsMobileMotion();
  const displayItems = useMemo(() => {
    if (!isMobile || items.length <= 2) return items;
    return [{ label: '…' }, ...items.slice(-2)];
  }, [isMobile, items]);

  if (displayItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-muted-foreground">
        {displayItems.map((item, idx) => {
          const isLast = idx === displayItems.length - 1;
          const labelClass = cn(
            'max-w-[16rem] truncate',
            isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
          );
          return (
            <li key={`${item.label}-${idx}`} className="flex min-w-0 items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={cn(
                    labelClass,
                    'transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={labelClass}>{item.label}</span>
              )}
              {!isLast && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

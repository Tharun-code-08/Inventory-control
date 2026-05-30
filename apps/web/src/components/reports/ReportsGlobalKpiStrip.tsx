import type { ElementType } from 'react';
import {
  DashboardKpiCard,
  DashboardKpiCardSkeleton,
} from '@/components/dashboard/DashboardKpiCard';

export type ReportsKpiItem = {
  key: string;
  label: string;
  numericValue: number;
  format?: (value: number) => string;
  icon: ElementType;
  iconClassName?: string;
  iconWrapClassName?: string;
  ariaLabel: string;
  onClick: () => void;
};

type ReportsGlobalKpiStripProps = {
  isLoading: boolean;
  items: ReportsKpiItem[];
};

export function ReportsGlobalKpiStrip({ isLoading, items }: ReportsGlobalKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <DashboardKpiCardSkeleton key={i} />)
        : items.map((item) => (
            <DashboardKpiCard
              key={item.key}
              label={item.label}
              numericValue={item.numericValue}
              format={item.format}
              icon={item.icon}
              iconClassName={item.iconClassName}
              iconWrapClassName={item.iconWrapClassName}
              ariaLabel={item.ariaLabel}
              onClick={item.onClick}
            />
          ))}
    </div>
  );
}

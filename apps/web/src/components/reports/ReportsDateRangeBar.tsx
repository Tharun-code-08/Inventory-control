import { cn } from '@/lib/cn';

export type ReportsDatePreset =
  | 'today'
  | '7d'
  | '30d'
  | 'this-month'
  | 'last-month'
  | 'custom';

type ReportsDateRangeBarProps = {
  preset: ReportsDatePreset;
  dateFrom?: string;
  dateTo?: string;
  onPresetChange: (preset: ReportsDatePreset, range: { from?: string; to?: string }) => void;
  onCustomChange: (from?: string, to?: string) => void;
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeForPreset(preset: ReportsDatePreset): { from: string; to: string } {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'today') {
    return { from: formatDateInput(startOfToday), to: formatDateInput(endOfToday) };
  }
  if (preset === '7d') {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 6);
    return { from: formatDateInput(from), to: formatDateInput(endOfToday) };
  }
  if (preset === '30d') {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 29);
    return { from: formatDateInput(from), to: formatDateInput(endOfToday) };
  }
  if (preset === 'this-month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: formatDateInput(from), to: formatDateInput(endOfToday) };
  }
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: formatDateInput(lastMonthStart), to: formatDateInput(lastMonthEnd) };
}

export function ReportsDateRangeBar({
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onCustomChange,
}: ReportsDateRangeBarProps) {
  const presets: Array<{ key: ReportsDatePreset; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: 'this-month', label: 'This Month' },
    { key: 'last-month', label: 'Last Month' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.key === 'custom') {
                onPresetChange('custom', { from: dateFrom, to: dateTo });
                return;
              }
              onPresetChange(item.key, rangeForPreset(item.key));
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition',
              preset === item.key
                ? 'border-primary/70 bg-primary/10 text-primary'
                : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">
          From
          <input
            type="date"
            className="ml-2 h-9 rounded-lg border border-border/70 bg-background px-2 text-sm"
            value={dateFrom ?? ''}
            onChange={(e) => onCustomChange(e.target.value || undefined, dateTo)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          To
          <input
            type="date"
            className="ml-2 h-9 rounded-lg border border-border/70 bg-background px-2 text-sm"
            value={dateTo ?? ''}
            onChange={(e) => onCustomChange(dateFrom, e.target.value || undefined)}
          />
        </label>
      </div>
    </div>
  );
}

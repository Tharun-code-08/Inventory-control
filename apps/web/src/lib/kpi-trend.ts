export type KpiTrendDirection = 'up' | 'down' | 'neutral';

export type KpiTrend = {
  direction: KpiTrendDirection;
  label: string;
};

export function computePeriodTrend(current: number, prior: number, periodLabel = 'prior 30 days'): KpiTrend {
  if (current === 0 && prior === 0) {
    return { direction: 'neutral', label: `■ No change vs ${periodLabel}` };
  }
  if (prior === 0) {
    return { direction: 'up', label: `▲ New activity vs ${periodLabel}` };
  }
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) {
    return { direction: 'neutral', label: `■ No change vs ${periodLabel}` };
  }
  if (pct > 0) {
    return { direction: 'up', label: `▲ +${pct}% vs ${periodLabel}` };
  }
  return { direction: 'down', label: `▼ ${pct}% vs ${periodLabel}` };
}

export function trendToneClass(direction: KpiTrendDirection): string {
  switch (direction) {
    case 'up':
      return 'text-emerald-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

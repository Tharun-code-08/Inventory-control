import { computePeriodTrend, trendToneClass } from '@/lib/kpi-trend';

describe('kpi-trend', () => {
  it('computes positive percent change', () => {
    expect(computePeriodTrend(115, 100)).toEqual({
      direction: 'up',
      label: '▲ +15% vs prior 30 days',
    });
  });

  it('computes negative percent change', () => {
    expect(computePeriodTrend(80, 100)).toEqual({
      direction: 'down',
      label: '▼ -20% vs prior 30 days',
    });
  });

  it('returns neutral when unchanged', () => {
    expect(computePeriodTrend(10, 10)).toEqual({
      direction: 'neutral',
      label: '■ No change vs prior 30 days',
    });
  });

  it('maps trend tone classes', () => {
    expect(trendToneClass('up')).toContain('emerald');
    expect(trendToneClass('down')).toContain('red');
    expect(trendToneClass('neutral')).toContain('muted');
  });
});

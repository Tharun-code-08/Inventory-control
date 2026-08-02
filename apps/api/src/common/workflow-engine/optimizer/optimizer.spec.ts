import { assignVariant, variantBucketPercent } from './ab-assignment';
import { recommendTemplates } from './template-optimizer';

describe('assignVariant', () => {
  it('is deterministic for the same key + experiment', () => {
    const a = assignVariant('cust-1', 'exp-tone', ['A', 'B'] as const);
    const b = assignVariant('cust-1', 'exp-tone', ['A', 'B'] as const);
    expect(a).toBe(b);
  });

  it('spreads keys across variants', () => {
    const counts = { A: 0, B: 0 };
    for (let i = 0; i < 200; i++) counts[assignVariant(`cust-${i}`, 'exp', ['A', 'B'] as const)]++;
    expect(counts.A).toBeGreaterThan(50);
    expect(counts.B).toBeGreaterThan(50);
  });

  it('throws on empty variants and reports a 0..99 bucket', () => {
    expect(() => assignVariant('k', 'e', [] as const)).toThrow();
    const p = variantBucketPercent('k', 'e');
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(100);
  });
});

describe('recommendTemplates', () => {
  it('promotes the best and retires the laggard per channel', () => {
    const recs = recommendTemplates([
      { key: 'wa-friendly', channel: 'WHATSAPP', sent: 100, converted: 40 },
      { key: 'wa-firm', channel: 'WHATSAPP', sent: 100, converted: 10 },
    ]);
    const friendly = recs.find((r) => r.key === 'wa-friendly')!;
    const firm = recs.find((r) => r.key === 'wa-firm')!;
    expect(friendly.recommendation).toBe('promote');
    expect(firm.recommendation).toBe('retire');
  });

  it('flags insufficient data below the sample threshold', () => {
    const recs = recommendTemplates([{ key: 'x', channel: 'EMAIL', sent: 5, converted: 3 }]);
    expect(recs[0].recommendation).toBe('insufficient-data');
  });
});

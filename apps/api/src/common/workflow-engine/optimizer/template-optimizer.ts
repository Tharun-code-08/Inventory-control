/**
 * Template / channel optimizer (Plan §12, Phase 4). Pure. Turns observed
 * per-variant performance into *recommendations* — it never mutates production
 * behaviour automatically (the plan's explicit constraint); a human applies them.
 */
export interface VariantStat {
  readonly key: string; // template/variant key
  readonly channel: string;
  readonly sent: number;
  readonly converted: number; // e.g. led to payment/read
}

export type Recommendation = 'promote' | 'keep' | 'retire' | 'insufficient-data';

export interface VariantRecommendation {
  readonly key: string;
  readonly channel: string;
  readonly conversionRate: number;
  readonly sampleSize: number;
  readonly recommendation: Recommendation;
  readonly note: string;
}

const MIN_SAMPLE = 30;

/** Rate a set of variants per channel, flagging the best and the laggards. */
export function recommendTemplates(stats: readonly VariantStat[]): VariantRecommendation[] {
  const rate = (s: VariantStat) => (s.sent > 0 ? s.converted / s.sent : 0);

  // Best conversion rate per channel among sufficiently-sampled variants.
  const bestByChannel = new Map<string, number>();
  for (const s of stats) {
    if (s.sent < MIN_SAMPLE) continue;
    bestByChannel.set(s.channel, Math.max(bestByChannel.get(s.channel) ?? 0, rate(s)));
  }

  return stats.map((s) => {
    const cr = Math.round(rate(s) * 1000) / 10; // %
    if (s.sent < MIN_SAMPLE) {
      return { key: s.key, channel: s.channel, conversionRate: cr, sampleSize: s.sent, recommendation: 'insufficient-data', note: `only ${s.sent} sends (<${MIN_SAMPLE})` };
    }
    const best = bestByChannel.get(s.channel) ?? 0;
    const r = rate(s);
    if (r >= best) {
      return { key: s.key, channel: s.channel, conversionRate: cr, sampleSize: s.sent, recommendation: 'promote', note: 'best performer on this channel' };
    }
    if (r < best * 0.5) {
      return { key: s.key, channel: s.channel, conversionRate: cr, sampleSize: s.sent, recommendation: 'retire', note: 'converts under half the best variant' };
    }
    return { key: s.key, channel: s.channel, conversionRate: cr, sampleSize: s.sent, recommendation: 'keep', note: 'competitive' };
  });
}

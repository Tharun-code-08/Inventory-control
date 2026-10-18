import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { recommendTemplates, VariantRecommendation, VariantStat } from './template-optimizer';

/**
 * Monthly-optimizer backend (Plan §12). Derives per-channel send→conversion
 * stats from the notification timeline and returns recommendations. Advisory
 * only — it never changes production templates/channels automatically.
 */
@Injectable()
export class OptimizerService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(companyId: string, since?: Date): Promise<VariantRecommendation[]> {
    const where = { companyId, ...(since ? { occurredAt: { gte: since } } : {}) };
    const grouped = await this.prisma.notificationTimeline.groupBy({
      by: ['channel', 'kind'],
      where,
      _count: { _all: true },
    });

    // sent + converted (PAID) per channel.
    const sent = new Map<string, number>();
    const converted = new Map<string, number>();
    for (const g of grouped) {
      const channel = g.channel ?? 'UNKNOWN';
      if (g.kind === 'SENT') sent.set(channel, (sent.get(channel) ?? 0) + g._count._all);
      if (g.kind === 'PAID') converted.set(channel, (converted.get(channel) ?? 0) + g._count._all);
    }

    const stats: VariantStat[] = [...sent.keys()].map((channel) => ({
      key: `${channel.toLowerCase()}-default`,
      channel,
      sent: sent.get(channel) ?? 0,
      converted: converted.get(channel) ?? 0,
    }));
    return recommendTemplates(stats);
  }
}

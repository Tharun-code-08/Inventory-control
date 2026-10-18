import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface AnalyticsRange {
  readonly from?: Date;
  readonly to?: Date;
}

export interface DeliveryFunnel {
  readonly byState: Record<string, number>;
  readonly total: number;
}

export interface ChannelBreakdown {
  readonly channel: string;
  readonly count: number;
}

export interface EngagementSummary {
  readonly sent: number;
  readonly read: number;
  readonly replied: number;
  readonly paid: number;
  readonly readRate: number;
  readonly replyRate: number;
  readonly conversionRate: number;
}

/**
 * Analytics aggregation (Plan §12). Read-only rollups over NotificationDelivery
 * and NotificationTimeline that back the dashboards (delivery/read/reply/
 * conversion, channel success). All queries are tenant-scoped by companyId.
 *
 * The monthly optimizer (Plan §12) consumes these numbers to *recommend* better
 * templates/channels; it never changes production behaviour automatically.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async deliveryFunnel(companyId: string, range: AnalyticsRange = {}): Promise<DeliveryFunnel> {
    const grouped = await this.prisma.notificationDelivery.groupBy({
      by: ['state'],
      where: { companyId, createdAt: this.between(range) },
      _count: { _all: true },
    });
    const byState: Record<string, number> = {};
    let total = 0;
    for (const g of grouped) {
      const n = g._count._all;
      byState[g.state] = n;
      total += n;
    }
    return { byState, total };
  }

  async channelSuccess(companyId: string, range: AnalyticsRange = {}): Promise<ChannelBreakdown[]> {
    const grouped = await this.prisma.notificationDelivery.groupBy({
      by: ['channel'],
      where: { companyId, createdAt: this.between(range) },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ channel: g.channel, count: g._count._all }));
  }

  /** Funnel from the timeline: sent → read → replied → paid, with rates. */
  async engagementSummary(companyId: string, range: AnalyticsRange = {}): Promise<EngagementSummary> {
    const grouped = await this.prisma.notificationTimeline.groupBy({
      by: ['kind'],
      where: { companyId, occurredAt: this.between(range) },
      _count: { _all: true },
    });
    const count = (k: string) => grouped.find((g) => g.kind === k)?._count._all ?? 0;
    const sent = count('SENT');
    const read = count('READ');
    const replied = count('REPLIED');
    const paid = count('PAID');
    const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
    return {
      sent,
      read,
      replied,
      paid,
      readRate: rate(read, sent),
      replyRate: rate(replied, sent),
      conversionRate: rate(paid, sent),
    };
  }

  /**
   * AI advisor accuracy (Plan §12 "AI Accuracy"): of customers with a stored
   * channel-preference memory, the share where that channel matches the channel
   * they actually engaged with most (per RecipientEngagement signals).
   */
  async aiChannelAccuracy(companyId: string): Promise<{ evaluated: number; correct: number; accuracy: number }> {
    const [memories, engagements] = await Promise.all([
      this.prisma.aiMemory.findMany({ where: { companyId, scope: 'customer', key: 'channel-preference' } }),
      this.prisma.recipientEngagement.findMany({ where: { companyId } }),
    ]);
    // Best actual channel per customer by reliability-weighted engagement.
    const bestActual = new Map<string, string>();
    const bestScore = new Map<string, number>();
    for (const e of engagements) {
      const score = e.opened + e.replied + e.paid;
      if (score > (bestScore.get(e.customerId) ?? -1)) {
        bestScore.set(e.customerId, score);
        bestActual.set(e.customerId, e.channel);
      }
    }
    let evaluated = 0;
    let correct = 0;
    for (const m of memories) {
      const actual = bestActual.get(m.refId);
      if (!actual) continue;
      evaluated += 1;
      const predicted = (m.value as { channel?: string } | null)?.channel;
      if (predicted && predicted === actual) correct += 1;
    }
    return { evaluated, correct, accuracy: evaluated > 0 ? Math.round((correct / evaluated) * 1000) / 10 : 0 };
  }

  private between(range: AnalyticsRange) {
    if (!range.from && !range.to) return undefined;
    return { gte: range.from, lte: range.to };
  }
}

import { Injectable } from '@nestjs/common';
import type { AiModelRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResolvedAiSettings } from '../../settings/ai-settings.service';

export type QuotaCheck =
  | { allowed: true }
  | { allowed: false; reason: 'daily_requests' | 'monthly_tokens' | 'monthly_cost' };

export type UsageEntry = {
  companyId: string;
  conversationId: string | null;
  model: string;
  role: AiModelRole;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  toolDurationMs: number | null;
  toolErrors: number;
  toolCallCount?: number;
  toolRounds?: number;
  durationMs?: number | null;
  timedOut?: boolean;
  escalated?: boolean;
  humanHandoff?: boolean;
};

/**
 * Per-tenant AI quota enforcement + metering. Counters are derived from
 * ai_usage_logs (no separate counter state to drift); limits come from the
 * tenant's resolved AiSettings. Checked BEFORE any provider call.
 */
@Injectable()
export class UsageLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async check(companyId: string, settings: ResolvedAiSettings): Promise<QuotaCheck> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, monthAgg] = await Promise.all([
      settings.dailyRequestLimit
        ? this.prisma.aiUsageLog.count({
            where: { companyId, createdAt: { gte: startOfDay } },
          })
        : Promise.resolve(0),
      settings.monthlyTokenLimit || settings.monthlyCostCentsLimit
        ? this.prisma.aiUsageLog.aggregate({
            where: { companyId, createdAt: { gte: startOfMonth } },
            _sum: { inputTokens: true, outputTokens: true, costCents: true },
          })
        : Promise.resolve(null),
    ]);

    if (settings.dailyRequestLimit && todayCount >= settings.dailyRequestLimit) {
      return { allowed: false, reason: 'daily_requests' };
    }
    if (monthAgg) {
      const tokens = (monthAgg._sum.inputTokens ?? 0) + (monthAgg._sum.outputTokens ?? 0);
      if (settings.monthlyTokenLimit && tokens >= settings.monthlyTokenLimit) {
        return { allowed: false, reason: 'monthly_tokens' };
      }
      const cost = monthAgg._sum.costCents ?? 0;
      if (settings.monthlyCostCentsLimit && cost >= settings.monthlyCostCentsLimit) {
        return { allowed: false, reason: 'monthly_cost' };
      }
    }
    return { allowed: true };
  }

  async record(entry: UsageEntry): Promise<void> {
    await this.prisma.aiUsageLog.create({
      data: {
        companyId: entry.companyId,
        conversationId: entry.conversationId,
        model: entry.model,
        role: entry.role,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        costCents: entry.costCents,
        toolDurationMs: entry.toolDurationMs,
        toolErrors: entry.toolErrors,
        toolCallCount: entry.toolCallCount ?? 0,
        toolRounds: entry.toolRounds ?? 0,
        durationMs: entry.durationMs ?? null,
        timedOut: entry.timedOut ?? false,
        escalated: entry.escalated ?? false,
        humanHandoff: entry.humanHandoff ?? false,
      },
    });
  }
}

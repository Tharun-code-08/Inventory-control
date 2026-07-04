import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import type { AiRole } from '../ai/provider/ai-provider.interface';

export type ResolvedAiSettings = {
  provider: string;
  models: Record<AiRole, string>;
  featureFlags: Record<string, boolean>;
  dailyRequestLimit: number | null;
  monthlyTokenLimit: number | null;
  monthlyCostCentsLimit: number | null;
  systemPrompt: string | null;
  promptVersion: number;
};

const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  stock: true,
  sales: true,
  purchase: true,
};

/**
 * Per-tenant AI configuration. A missing AiSettings row means "platform
 * defaults" (from env config) — upgrading a model for everyone is an env
 * change; per-tenant overrides live on the row. No model id is hardcoded in
 * behavior code. The three logical roles currently all map to the single
 * configured DeepSeek model; per-role models return when multiple are needed.
 */
@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async forCompany(companyId: string): Promise<ResolvedAiSettings> {
    const row = await this.prisma.aiSettings.findUnique({ where: { companyId } });
    const flagsRow =
      row?.featureFlags && typeof row.featureFlags === 'object' && !Array.isArray(row.featureFlags)
        ? (row.featureFlags as Record<string, boolean>)
        : {};
    const defaultModel = this.config.getOrThrow<string>('AI_MODEL');
    return {
      provider: row?.provider ?? 'deepseek',
      models: {
        intent: row?.intentModel ?? defaultModel,
        reasoning: row?.reasoningModel ?? defaultModel,
        escalation: row?.escalationModel ?? defaultModel,
      },
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...flagsRow },
      dailyRequestLimit: row?.dailyRequestLimit ?? this.numberOrNull('AI_DAILY_REQUEST_LIMIT'),
      monthlyTokenLimit: row?.monthlyTokenLimit ?? this.numberOrNull('AI_MONTHLY_TOKEN_LIMIT'),
      monthlyCostCentsLimit: row?.monthlyCostCentsLimit ?? null,
      systemPrompt: row?.systemPrompt ?? null,
      promptVersion: row?.promptVersion ?? 0,
    };
  }

  /**
   * Versioned system-prompt update: the previous body is preserved in
   * AiPromptHistory, so rollback = writing an older version's body back.
   */
  async updateSystemPrompt(companyId: string, body: string, updatedBy?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.aiSettings.findUnique({ where: { companyId } });
      const nextVersion = (current?.promptVersion ?? 0) + 1;
      await tx.aiPromptHistory.create({
        data: { companyId, version: nextVersion, body, createdById: updatedBy ?? null },
      });
      return tx.aiSettings.upsert({
        where: { companyId },
        create: { companyId, systemPrompt: body, promptVersion: nextVersion },
        update: { systemPrompt: body, promptVersion: nextVersion },
      });
    });
  }

  /** Upsert provider/model/flag/budget settings for a company. */
  async updateSettings(
    companyId: string,
    patch: {
      provider?: string;
      intentModel?: string;
      reasoningModel?: string;
      escalationModel?: string;
      featureFlags?: Record<string, boolean>;
      dailyRequestLimit?: number | null;
      monthlyTokenLimit?: number | null;
      monthlyCostCentsLimit?: number | null;
    },
  ) {
    return this.prisma.aiSettings.upsert({
      where: { companyId },
      create: { companyId, ...patch },
      update: patch,
    });
  }

  /** List all historical system-prompt versions for a company. */
  async promptHistory(companyId: string) {
    return this.prisma.aiPromptHistory.findMany({
      where: { companyId },
      orderBy: { version: 'desc' },
      select: { version: true, body: true, createdAt: true, createdById: true },
    });
  }

  private numberOrNull(key: string): number | null {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  }
}

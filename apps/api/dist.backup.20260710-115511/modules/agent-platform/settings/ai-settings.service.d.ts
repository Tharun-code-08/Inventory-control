import { ConfigService } from '@nestjs/config';
import { PrismaService } from "../../../prisma/prisma.service";
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
export declare class AiSettingsService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    forCompany(companyId: string): Promise<ResolvedAiSettings>;
    updateSystemPrompt(companyId: string, body: string, updatedBy?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        provider: string;
        intentModel: string | null;
        reasoningModel: string | null;
        escalationModel: string | null;
        featureFlags: import("@prisma/client/runtime/library").JsonValue;
        dailyRequestLimit: number | null;
        monthlyTokenLimit: number | null;
        monthlyCostCentsLimit: number | null;
        approvalPolicy: import("@prisma/client/runtime/library").JsonValue;
        promptVersion: number;
        systemPrompt: string | null;
    }>;
    updateSettings(companyId: string, patch: {
        provider?: string;
        intentModel?: string;
        reasoningModel?: string;
        escalationModel?: string;
        featureFlags?: Record<string, boolean>;
        dailyRequestLimit?: number | null;
        monthlyTokenLimit?: number | null;
        monthlyCostCentsLimit?: number | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        provider: string;
        intentModel: string | null;
        reasoningModel: string | null;
        escalationModel: string | null;
        featureFlags: import("@prisma/client/runtime/library").JsonValue;
        dailyRequestLimit: number | null;
        monthlyTokenLimit: number | null;
        monthlyCostCentsLimit: number | null;
        approvalPolicy: import("@prisma/client/runtime/library").JsonValue;
        promptVersion: number;
        systemPrompt: string | null;
    }>;
    promptHistory(companyId: string): Promise<{
        createdAt: Date;
        createdById: string | null;
        version: number;
        body: string;
    }[]>;
    private numberOrNull;
}

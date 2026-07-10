import type { RequestUser } from "../../../common/types/request-user";
import { AiSettingsService } from './ai-settings.service';
import { PlatformHealthService } from '../ai/platform-health.service';
declare class UpdateAiSettingsDto {
    provider?: string;
    intentModel?: string;
    reasoningModel?: string;
    escalationModel?: string;
    featureFlags?: Record<string, boolean>;
    dailyRequestLimit?: number | null;
    monthlyTokenLimit?: number | null;
    monthlyCostCentsLimit?: number | null;
}
declare class UpdateSystemPromptDto {
    body?: string;
}
export declare class AiSettingsController {
    private readonly settings;
    private readonly health;
    constructor(settings: AiSettingsService, health: PlatformHealthService);
    get(user: RequestUser): Promise<import("./ai-settings.service").ResolvedAiSettings | null>;
    update(user: RequestUser, dto: UpdateAiSettingsDto): Promise<import("./ai-settings.service").ResolvedAiSettings | null>;
    updatePrompt(user: RequestUser, dto: UpdateSystemPromptDto): Promise<{
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
    } | null>;
    promptHistory(user: RequestUser): Promise<{
        createdAt: Date;
        createdById: string | null;
        version: number;
        body: string;
    }[]>;
    circuitHealth(): Record<import("../ai/platform-health.service").CircuitDependency, {
        open: boolean;
        consecutiveFailures: number;
        totalFailures: number;
        totalSuccesses: number;
    }>;
}
export {};

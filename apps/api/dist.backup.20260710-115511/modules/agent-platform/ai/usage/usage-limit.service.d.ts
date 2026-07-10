import type { AiModelRole } from '@prisma/client';
import { PrismaService } from "../../../../prisma/prisma.service";
import type { ResolvedAiSettings } from '../../settings/ai-settings.service';
export type QuotaCheck = {
    allowed: true;
} | {
    allowed: false;
    reason: 'daily_requests' | 'monthly_tokens' | 'monthly_cost';
};
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
export declare class UsageLimitService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(companyId: string, settings: ResolvedAiSettings): Promise<QuotaCheck>;
    record(entry: UsageEntry): Promise<void>;
}

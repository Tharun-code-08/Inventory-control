import { ConfigService } from '@nestjs/config';
import { type Conversation, type UserChannelLink } from '@prisma/client';
import { PrismaService } from "../../../prisma/prisma.service";
import { LinkService } from '../link/link.service';
import { AiSettingsService } from '../settings/ai-settings.service';
import type { AgentTaskWithSteps } from '../tasks/agent-task.service';
import type { AiProvider } from './provider/ai-provider.interface';
import { ToolRegistry } from './tools/tool-registry';
import { UsageLimitService } from './usage/usage-limit.service';
import { PlatformHealthService } from './platform-health.service';
export declare const REPLIES: {
    readonly notConfigured: "🤖 The AI assistant is not configured yet. Ask your administrator to finish the setup.";
    readonly accountInactive: "Your ERP account linked to this number is no longer active. Please contact your administrator.";
    readonly quotaReached: "⛔ Your company's AI usage limit has been reached. Try again later, or ask your administrator to raise the limit.";
    readonly failure: "⚠️ Sorry, I could not process that right now. Please try again in a moment — if this keeps happening, contact your administrator.";
    readonly empty: "Sorry, I could not come up with an answer for that. Try rephrasing your question.";
};
export declare class AiOrchestratorService {
    private readonly prisma;
    private readonly config;
    private readonly provider;
    private readonly registry;
    private readonly settings;
    private readonly usage;
    private readonly links;
    private readonly health;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, provider: AiProvider, registry: ToolRegistry, settings: AiSettingsService, usage: UsageLimitService, links: LinkService, health: PlatformHealthService);
    respond(link: UserChannelLink, conversation: Conversation, userMessage: string, excludeMessageId?: string, pendingTask?: AgentTaskWithSteps): Promise<string>;
    private dispatchTool;
    private runWithRetry;
    private loadHistory;
    private buildSystemPrompt;
    private recordUsage;
    private maxTokens;
    private maxToolRounds;
    private toolTimeoutMs;
}

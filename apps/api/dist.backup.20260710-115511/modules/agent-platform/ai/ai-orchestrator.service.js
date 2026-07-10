"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiOrchestratorService = exports.REPLIES = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
const link_service_1 = require("../link/link.service");
const ai_settings_service_1 = require("../settings/ai-settings.service");
const ai_provider_token_1 = require("./provider/ai-provider.token");
const tool_registry_1 = require("./tools/tool-registry");
const model_cost_1 = require("./usage/model-cost");
const usage_limit_service_1 = require("./usage/usage-limit.service");
const platform_health_service_1 = require("./platform-health.service");
exports.REPLIES = {
    notConfigured: '🤖 The AI assistant is not configured yet. Ask your administrator to finish the setup.',
    accountInactive: 'Your ERP account linked to this number is no longer active. Please contact your administrator.',
    quotaReached: "⛔ Your company's AI usage limit has been reached. Try again later, or ask your administrator to raise the limit.",
    failure: '⚠️ Sorry, I could not process that right now. Please try again in a moment — if this keeps happening, contact your administrator.',
    empty: 'Sorry, I could not come up with an answer for that. Try rephrasing your question.',
};
const HISTORY_LIMIT = 20;
const DEFAULT_SYSTEM_PROMPT = `You are the WhatsApp ERP assistant for SoftDigit Inventory ERP.

*Tone*: Conversational, helpful, concise. WhatsApp messages — a few short lines. Use *bold* and bullet lines with "-". No tables, no headers, no markdown code blocks.

*Data rules*:
- Answer ONLY from tool results. Never invent numbers, prices, or names.
- Currency is Indian Rupees (₹). Use units of measure when known.
- You only see this user's company data — every tool is already scoped.

*Write tools — IMPORTANT*:
- You can DRAFT: purchase orders (create_purchase_order), sales orders (create_sales_order), goods receipts (create_goods_receipt), invoices (create_invoice), stock transfers (create_stock_transfer), stock write-offs (write_off_stock), new products (create_product), product updates incl. price changes (update_product), suppliers (create_supplier), customers (create_customer), and full-PO receipts (receive_purchase_order for "received PO-x in full").
- Drafting NEVER creates anything in ERP — the user must reply "approve" or "yes" to confirm.
- When the user says "create PO", "make a PO", "raise purchase order" etc. — IMMEDIATELY ask for the missing details: which product(s), quantity, and supplier. Do NOT show a help menu.
- When the user says "create SO" or "sales order" — ask for customer name and items.
- After calling a write tool, relay its returned draft summary VERBATIM. Do not rephrase it.
- Approving an invoice ISSUES it immediately and may auto-email the customer — always include this warning in the draft.
- GR and stock transfers remain ERP drafts until a human posts them.

*Clarification*: Ask ONE short question when a request is ambiguous. Never bombard with multiple questions.`;
class ToolTimeoutError extends Error {
    constructor(name, ms) {
        super(`Tool ${name} timed out after ${ms}ms`);
    }
}
function withTimeout(work, ms, name) {
    let timer;
    return Promise.race([
        work,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new ToolTimeoutError(name, ms)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
}
function toToolJson(value, maxChars = 6_000) {
    let json;
    try {
        json = JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v)) ?? 'null';
    }
    catch {
        json = String(value);
    }
    return json.length > maxChars ? `${json.slice(0, maxChars)}…(truncated)` : json;
}
let AiOrchestratorService = AiOrchestratorService_1 = class AiOrchestratorService {
    prisma;
    config;
    provider;
    registry;
    settings;
    usage;
    links;
    health;
    logger = new common_1.Logger(AiOrchestratorService_1.name);
    constructor(prisma, config, provider, registry, settings, usage, links, health) {
        this.prisma = prisma;
        this.config = config;
        this.provider = provider;
        this.registry = registry;
        this.settings = settings;
        this.usage = usage;
        this.links = links;
        this.health = health;
    }
    async respond(link, conversation, userMessage, excludeMessageId, pendingTask) {
        if (!this.provider.isConfigured())
            return exports.REPLIES.notConfigured;
        if (this.health.isOpen('ai_provider'))
            return exports.REPLIES.failure;
        const user = await this.links.buildRequestUser(link);
        if (!user)
            return exports.REPLIES.accountInactive;
        const resolved = await this.settings.forCompany(link.companyId);
        const quota = await this.usage.check(link.companyId, resolved);
        if (!quota.allowed) {
            this.logger.warn(`AI quota reached for company ${link.companyId}: ${quota.reason}`);
            return exports.REPLIES.quotaReached;
        }
        const history = await this.loadHistory(conversation.id, excludeMessageId);
        const tools = this.registry.listFor(user, resolved.featureFlags);
        let toolDurationMs = 0;
        const turnStartedAt = Date.now();
        const ctx = Object.freeze({
            user,
            companyId: link.companyId,
            conversationId: conversation.id,
            linkId: link.id,
        });
        const executeTool = async (call) => {
            const startedAt = Date.now();
            try {
                const result = await this.dispatchTool(ctx, call);
                return result;
            }
            finally {
                toolDurationMs += Date.now() - startedAt;
            }
        };
        try {
            const result = await this.provider.runConversation({
                model: resolved.models.reasoning,
                system: this.buildSystemPrompt(resolved.systemPrompt, conversation.summary, pendingTask),
                maxTokens: this.maxTokens(),
                history,
                userMessage,
                tools: this.registry.toDefs(tools),
                executeTool,
                maxToolRounds: this.maxToolRounds(),
            });
            this.health.recordSuccess('ai_provider');
            await this.recordUsage({
                companyId: link.companyId,
                conversationId: conversation.id,
                model: resolved.models.reasoning,
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                toolDurationMs,
                toolErrors: result.toolErrorCount,
                toolCallCount: result.toolCallCount,
                toolRounds: result.toolRounds,
                durationMs: Date.now() - turnStartedAt,
                timedOut: false,
            });
            return result.text || exports.REPLIES.empty;
        }
        catch (err) {
            this.health.recordFailure('ai_provider');
            this.logger.error(`AI turn failed for conversation ${conversation.id}: ${err instanceof Error ? err.message : String(err)}`);
            const isAbort = err instanceof Error && err.name === 'AbortError';
            await this.recordUsage({
                companyId: link.companyId,
                conversationId: conversation.id,
                model: resolved.models.reasoning,
                inputTokens: 0,
                outputTokens: 0,
                toolDurationMs,
                toolErrors: 1,
                toolCallCount: 0,
                toolRounds: 0,
                durationMs: Date.now() - turnStartedAt,
                timedOut: isAbort,
                humanHandoff: true,
            });
            return exports.REPLIES.failure;
        }
    }
    async dispatchTool(ctx, call) {
        const tool = this.registry.get(call.name);
        if (!tool) {
            return { content: `Unknown tool: ${call.name}`, isError: true };
        }
        if (tool.requiredPermission && !ctx.user.permissions.includes(tool.requiredPermission)) {
            return {
                content: `The user does not have permission (${tool.requiredPermission}) for this tool.`,
                isError: true,
            };
        }
        try {
            const value = await this.runWithRetry(tool, ctx, call.input);
            return { content: toToolJson(value) };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Tool ${call.name} failed: ${message}`);
            return { content: `Tool failed: ${message}`, isError: true };
        }
    }
    async runWithRetry(tool, ctx, input) {
        const timeoutMs = this.toolTimeoutMs();
        try {
            return await withTimeout(tool.handler(ctx, input), timeoutMs, tool.name);
        }
        catch (err) {
            if (!(err instanceof ToolTimeoutError))
                throw err;
            return withTimeout(tool.handler(ctx, input), timeoutMs, tool.name);
        }
    }
    async loadHistory(conversationId, excludeMessageId) {
        const rows = await this.prisma.message.findMany({
            where: {
                conversationId,
                status: { not: client_1.ChatMessageStatus.FAILED },
                ...(excludeMessageId ? { id: { not: excludeMessageId } } : {}),
                body: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_LIMIT,
            select: { direction: true, body: true },
        });
        return rows
            .reverse()
            .map((row) => ({
            role: row.direction === client_1.MessageDirection.IN ? 'user' : 'assistant',
            text: row.body ?? '',
        }));
    }
    buildSystemPrompt(tenantPrompt, summary, pendingTask) {
        const parts = [tenantPrompt?.trim() || DEFAULT_SYSTEM_PROMPT];
        parts.push(`Today's date: ${new Date().toISOString().slice(0, 10)}.`);
        if (summary?.trim()) {
            parts.push(`Summary of the earlier conversation:\n${summary.trim()}`);
        }
        if (pendingTask) {
            parts.push(`PENDING TASK #${pendingTask.taskNumber} is awaiting the user's decision:\n${pendingTask.summary}\n` +
                'If the user asks for changes, call the drafting tool again with the FULL corrected details — the new draft automatically replaces this one. ' +
                'If they seem to want to proceed or abort, tell them to reply exactly "approve" or "cancel". Never claim anything was created or cancelled yourself.');
        }
        return parts.join('\n\n');
    }
    async recordUsage(entry) {
        try {
            await this.usage.record({
                companyId: entry.companyId,
                conversationId: entry.conversationId,
                model: entry.model,
                role: client_1.AiModelRole.REASONING,
                inputTokens: entry.inputTokens,
                outputTokens: entry.outputTokens,
                costCents: (0, model_cost_1.estimateCostCents)(entry.model, entry.inputTokens, entry.outputTokens),
                toolDurationMs: entry.toolDurationMs || null,
                toolErrors: entry.toolErrors,
                toolCallCount: entry.toolCallCount,
                toolRounds: entry.toolRounds,
                durationMs: entry.durationMs || null,
                timedOut: entry.timedOut,
                humanHandoff: entry.humanHandoff ?? false,
            });
        }
        catch (err) {
            this.logger.error(`Failed to record AI usage: ${err.message}`);
        }
    }
    maxTokens() {
        return Number(this.config.get('AI_MAX_TOKENS') ?? 2_048);
    }
    maxToolRounds() {
        return Number(this.config.get('AI_MAX_TOOL_ROUNDS') ?? 6);
    }
    toolTimeoutMs() {
        return Number(this.config.get('AI_TOOL_TIMEOUT_MS') ?? 5_000);
    }
};
exports.AiOrchestratorService = AiOrchestratorService;
exports.AiOrchestratorService = AiOrchestratorService = AiOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(ai_provider_token_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService, Object, tool_registry_1.ToolRegistry,
        ai_settings_service_1.AiSettingsService,
        usage_limit_service_1.UsageLimitService,
        link_service_1.LinkService,
        platform_health_service_1.PlatformHealthService])
], AiOrchestratorService);
//# sourceMappingURL=ai-orchestrator.service.js.map
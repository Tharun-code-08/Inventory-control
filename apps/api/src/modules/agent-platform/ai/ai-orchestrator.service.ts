import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiModelRole,
  ChatMessageStatus,
  MessageDirection,
  type Conversation,
  type UserChannelLink,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { LinkService } from '../link/link.service';
import { AiSettingsService } from '../settings/ai-settings.service';
import type { AgentTaskWithSteps } from '../tasks/agent-task.service';
import type { AiProvider, AiToolCall, AiToolResult } from './provider/ai-provider.interface';
import { AI_PROVIDER } from './provider/ai-provider.token';
import { ToolRegistry, type AgentTool, type AgentToolContext } from './tools/tool-registry';
import { estimateCostCents } from './usage/model-cost';
import { UsageLimitService } from './usage/usage-limit.service';
import { PlatformHealthService } from './platform-health.service';

export const REPLIES = {
  notConfigured:
    '🤖 The AI assistant is not configured yet. Ask your administrator to finish the setup.',
  accountInactive:
    'Your ERP account linked to this number is no longer active. Please contact your administrator.',
  quotaReached:
    "⛔ Your company's AI usage limit has been reached. Try again later, or ask your administrator to raise the limit.",
  failure:
    '⚠️ Sorry, I could not process that right now. Please try again in a moment — if this keeps happening, contact your administrator.',
  empty: 'Sorry, I could not come up with an answer for that. Try rephrasing your question.',
} as const;

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
  constructor(name: string, ms: number) {
    super(`Tool ${name} timed out after ${ms}ms`);
  }
}

function withTimeout<T>(work: Promise<T>, ms: number, name: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ToolTimeoutError(name, ms)), ms);
    }),
  ]).finally(() => clearTimeout(timer!)) as Promise<T>;
}

function toToolJson(value: unknown, maxChars = 6_000): string {
  let json: string;
  try {
    json = JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v)) ?? 'null';
  } catch {
    json = String(value);
  }
  return json.length > maxChars ? `${json.slice(0, maxChars)}…(truncated)` : json;
}

/**
 * Phase 2 conversation brain: hydrates memory from the persisted Message
 * history, enforces per-tenant quotas, runs the provider's tool loop against
 * the registry (with timeout + one retry per tool), and meters every turn to
 * ai_usage_logs. All failures degrade to a friendly reply — the webhook never
 * breaks.
 */
@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly registry: ToolRegistry,
    private readonly settings: AiSettingsService,
    private readonly usage: UsageLimitService,
    private readonly links: LinkService,
    private readonly health: PlatformHealthService,
  ) {}

  async respond(
    link: UserChannelLink,
    conversation: Conversation,
    userMessage: string,
    excludeMessageId?: string,
    pendingTask?: AgentTaskWithSteps,
  ): Promise<string> {
    if (!this.provider.isConfigured()) return REPLIES.notConfigured;
    if (this.health.isOpen('ai_provider')) return REPLIES.failure;

    const user = await this.links.buildRequestUser(link);
    if (!user) return REPLIES.accountInactive;

    const resolved = await this.settings.forCompany(link.companyId);
    const quota = await this.usage.check(link.companyId, resolved);
    if (!quota.allowed) {
      this.logger.warn(`AI quota reached for company ${link.companyId}: ${quota.reason}`);
      return REPLIES.quotaReached;
    }

    const history = await this.loadHistory(conversation.id, excludeMessageId);
    const tools = this.registry.listFor(user, resolved.featureFlags);
    let toolDurationMs = 0;
    const turnStartedAt = Date.now();

    // Immutable per-turn ExecutionContext — write tools attach drafts to it.
    const ctx: AgentToolContext = Object.freeze({
      user,
      companyId: link.companyId,
      conversationId: conversation.id,
      linkId: link.id,
    });
    const executeTool = async (call: AiToolCall): Promise<AiToolResult> => {
      const startedAt = Date.now();
      try {
        const result = await this.dispatchTool(ctx, call);
        return result;
      } finally {
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

      return result.text || REPLIES.empty;
    } catch (err) {
      this.health.recordFailure('ai_provider');
      this.logger.error(
        `AI turn failed for conversation ${conversation.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
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
      return REPLIES.failure;
    }
  }

  /** Registry dispatch with permission re-check and timeout + one retry. */
  private async dispatchTool(ctx: AgentToolContext, call: AiToolCall): Promise<AiToolResult> {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Tool ${call.name} failed: ${message}`);
      return { content: `Tool failed: ${message}`, isError: true };
    }
  }

  private async runWithRetry(
    tool: AgentTool,
    ctx: AgentToolContext,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const timeoutMs = this.toolTimeoutMs();
    try {
      return await withTimeout(tool.handler(ctx, input), timeoutMs, tool.name);
    } catch (err) {
      if (!(err instanceof ToolTimeoutError)) throw err;
      // One retry on timeout (transient DB latency), then give up gracefully.
      // Draft-creating tools are safe to retry: a duplicate draft supersedes.
      return withTimeout(tool.handler(ctx, input), timeoutMs, tool.name);
    }
  }

  private async loadHistory(conversationId: string, excludeMessageId?: string) {
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        status: { not: ChatMessageStatus.FAILED },
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
        role: row.direction === MessageDirection.IN ? ('user' as const) : ('assistant' as const),
        text: row.body ?? '',
      }));
  }

  private buildSystemPrompt(
    tenantPrompt: string | null,
    summary: string | null,
    pendingTask?: AgentTaskWithSteps,
  ): string {
    const parts = [tenantPrompt?.trim() || DEFAULT_SYSTEM_PROMPT];
    parts.push(`Today's date: ${new Date().toISOString().slice(0, 10)}.`);
    if (summary?.trim()) {
      parts.push(`Summary of the earlier conversation:\n${summary.trim()}`);
    }
    if (pendingTask) {
      parts.push(
        `PENDING TASK #${pendingTask.taskNumber} is awaiting the user's decision:\n${pendingTask.summary}\n` +
          'If the user asks for changes, call the drafting tool again with the FULL corrected details — the new draft automatically replaces this one. ' +
          'If they seem to want to proceed or abort, tell them to reply exactly "approve" or "cancel". Never claim anything was created or cancelled yourself.',
      );
    }
    return parts.join('\n\n');
  }

  private async recordUsage(entry: {
    companyId: string;
    conversationId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    toolDurationMs: number;
    toolErrors: number;
    toolCallCount: number;
    toolRounds: number;
    durationMs: number;
    timedOut: boolean;
    humanHandoff?: boolean;
  }): Promise<void> {
    try {
      await this.usage.record({
        companyId: entry.companyId,
        conversationId: entry.conversationId,
        model: entry.model,
        role: AiModelRole.REASONING,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        costCents: estimateCostCents(entry.model, entry.inputTokens, entry.outputTokens),
        toolDurationMs: entry.toolDurationMs || null,
        toolErrors: entry.toolErrors,
        toolCallCount: entry.toolCallCount,
        toolRounds: entry.toolRounds,
        durationMs: entry.durationMs || null,
        timedOut: entry.timedOut,
        humanHandoff: entry.humanHandoff ?? false,
      });
    } catch (err) {
      // Metering must never break a reply.
      this.logger.error(`Failed to record AI usage: ${(err as Error).message}`);
    }
  }

  private maxTokens(): number {
    return Number(this.config.get('AI_MAX_TOKENS') ?? 2_048);
  }

  private maxToolRounds(): number {
    return Number(this.config.get('AI_MAX_TOOL_ROUNDS') ?? 6);
  }

  private toolTimeoutMs(): number {
    return Number(this.config.get('AI_TOOL_TIMEOUT_MS') ?? 5_000);
  }
}

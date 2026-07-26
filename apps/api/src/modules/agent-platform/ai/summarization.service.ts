import { Inject, Injectable, Logger } from '@nestjs/common';
import { MessageDirection } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AiProvider } from './provider/ai-provider.interface';
import { AI_PROVIDER } from './provider/ai-provider.token';
import { AiSettingsService } from '../settings/ai-settings.service';

const SUMMARIZE_AFTER = 14; // trigger when history reaches this many messages
const SUMMARIZE_SYSTEM = `You are a conversation summarizer for an ERP WhatsApp assistant.
Produce a concise 3–6 bullet summary of the conversation below. Focus on:
- ERP operations discussed (stock checks, POs, SOs, invoices, transfers)
- Decisions made or pending (tasks approved/cancelled)
- Key figures mentioned (amounts, quantities, product names, dates)
- User preferences expressed (notification settings, etc.)
Omit greetings, thanks, and generic AI replies. Output only the bullet list, no preamble.`;

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly settings: AiSettingsService,
  ) {}

  /**
   * If the conversation has enough messages, generate a rolling summary and
   * store it on the Conversation row. Fire-and-forget — never throws to caller.
   */
  async maybeSummarize(conversationId: string, companyId: string): Promise<void> {
    try {
      const count = await this.prisma.message.count({ where: { conversationId } });
      if (count < SUMMARIZE_AFTER) return;

      // Only re-summarize every SUMMARIZE_AFTER messages to avoid AI spam.
      if (count % SUMMARIZE_AFTER !== 0) return;

      const rows = await this.prisma.message.findMany({
        where: { conversationId, body: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: SUMMARIZE_AFTER,
        select: { direction: true, body: true },
      });

      const history = rows.reverse().map((r) => ({
        role: r.direction === MessageDirection.IN ? ('user' as const) : ('assistant' as const),
        text: r.body ?? '',
      }));

      const resolved = await this.settings.forCompany(companyId);
      const result = await this.provider.runConversation({
        model: resolved.models.reasoning,
        system: SUMMARIZE_SYSTEM,
        maxTokens: 512,
        history,
        userMessage: 'Summarize the conversation above.',
        tools: [],
        executeTool: async () => ({ content: '' }),
        maxToolRounds: 0,
      });

      if (result.text?.trim()) {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { summary: result.text.trim() },
        });
        this.logger.debug(`Summarized conversation ${conversationId} (${count} messages)`);
      }
    } catch (err) {
      this.logger.warn(`Summarization failed for ${conversationId}: ${(err as Error).message}`);
    }
  }
}

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelLinkStatus,
  ChatChannel,
  ChatMessageStatus,
  ConversationStatus,
  MessageDirection,
  type Conversation,
  type UserChannelLink,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { AiOrchestratorService, REPLIES } from '../ai/ai-orchestrator.service';
import { SummarizationService } from '../ai/summarization.service';
import type { OutboundReply, QuickReply } from '../channels/channel-adapter.interface';
import { IntentService } from '../intent/intent.service';
import { LinkService } from '../link/link.service';
import { NotificationCommandService } from '../notifications/notification-command.service';
import { AgentTaskService } from '../tasks/agent-task.service';
import { TaskFlowService } from '../tasks/task-flow.service';

export type InboundText = {
  waMessageId: string;
  from: string;
  text: string;
  timestamp?: Date;
};

export type InboundMedia = {
  waMessageId: string;
  from: string;
  mediaType: string;
  timestamp?: Date;
};

export type WhatsAppSendJob = { messageId: string };

const LINKED_REPLY =
  '✅ WhatsApp linked successfully.\n\nWelcome! ' +
  'Ask me about stock, sales, low stock, top sellers, or what to reorder — in plain language.';

const MEDIA_REPLY =
  "🤖 I can only process text messages right now. Please type your question and I'll answer right away!";

const LINK_COMMAND_REGEX = /^LINK\s+((?:V1-)?[A-Z0-9]{6,12})$/i;

// ── Context-aware button sets ──────────────────────────────────────────────

const SNAPSHOT_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'snapshot', title: '📊 Get latest' },
  { id: 'low_stock', title: '📦 Low stock' },
  { id: 'revenue', title: '💰 Revenue' },
];

const STOCK_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'low_stock', title: '📦 Low stock' },
  { id: 'create_po', title: '🛒 Create PO' },
  { id: 'snapshot', title: '📊 Snapshot' },
];

const INVOICE_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'overdue', title: '⚠️ Overdue' },
  { id: 'create_so', title: '📝 Create SO' },
  { id: 'snapshot', title: '📊 Snapshot' },
];

const SALES_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'revenue', title: '💰 Revenue' },
  { id: 'create_so', title: '📝 Create SO' },
  { id: 'snapshot', title: '📊 Snapshot' },
];

const TASK_BUTTONS: [QuickReply, QuickReply] = [
  { id: 'approve', title: '✅ Approve' },
  { id: 'cancel', title: '❌ Cancel' },
];

// ── Reply topic detection ──────────────────────────────────────────────────

const SNAPSHOT_RE =
  /(?:📊|business\s+snapshot|(?:orders?|revenue|low[\s-]?stock|overdue)(?:.{0,80})(?:orders?|revenue|low[\s-]?stock|overdue))/is;
const STOCK_RE =
  /\b(stock|inventory|units?|qty|quantity|reorder|minimum\s+stock|out\s+of\s+stock)\b/i;
const INVOICE_RE =
  /\b(invoice|invoiced|overdue|payment|billing|receivable|outstanding\s+amount)\b/i;
const SALES_RE =
  /\b(sales?\s+order|revenue|customer|selling|sold|top\s+sell)\b/i;
const DRAFT_RE =
  /\b(draft|pending|approval|approve|confirm|cancel)\b/i;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly links: LinkService,
    private readonly intents: IntentService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly tasks: AgentTaskService,
    private readonly taskFlow: TaskFlowService,
    private readonly notifCommands: NotificationCommandService,
    private readonly summarization: SummarizationService,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue<WhatsAppSendJob>,
  ) {}

  async handleInboundText(inbound: InboundText): Promise<void> {
    if (inbound.waMessageId) {
      const seen = await this.prisma.message.findUnique({
        where: { waMessageId: inbound.waMessageId },
        select: { id: true },
      });
      if (seen) return;
    }

    const link = await this.prisma.userChannelLink.findUnique({
      where: { channel_phoneNumber: { channel: ChatChannel.WHATSAPP, phoneNumber: inbound.from } },
    });

    if (!link || link.status !== ChannelLinkStatus.ACTIVE) {
      await this.handleUnlinkedNumber(inbound);
      return;
    }

    const conversation = await this.getOrCreateActiveConversation(link);
    const inboundMessage = await this.persistInbound(conversation, inbound);

    void this.links
      .touchLastSeen(link)
      .then(() => this.buildReply(link, conversation, inbound.text, inboundMessage.id))
      .then((reply) => this.queueReply(conversation, reply))
      .then(() => this.summarization.maybeSummarize(conversation.id, link.companyId))
      .catch((err: Error) =>
        this.logger.error(`Conversation turn failed for link ${link.id}: ${err.message}`),
      );
  }

  /** Handle non-text messages (voice, image, document, etc.) with a friendly reply. */
  async handleInboundMedia(inbound: InboundMedia): Promise<void> {
    const link = await this.prisma.userChannelLink.findUnique({
      where: { channel_phoneNumber: { channel: ChatChannel.WHATSAPP, phoneNumber: inbound.from } },
    });
    if (!link || link.status !== ChannelLinkStatus.ACTIVE) return;

    const conversation = await this.getOrCreateActiveConversation(link);
    await this.persistInbound(conversation, {
      waMessageId: inbound.waMessageId,
      from: inbound.from,
      text: `[${inbound.mediaType}]`,
      timestamp: inbound.timestamp,
    });
    await this.queueOutboundText(conversation, MEDIA_REPLY);
  }

  private async buildReply(
    link: UserChannelLink,
    conversation: Conversation,
    rawText: string,
    inboundMessageId: string,
  ): Promise<OutboundReply> {
    // 1. Notification preference commands — must execute before intent/AI.
    const notifCommand = this.notifCommands.detect(rawText);
    if (notifCommand) return this.notifCommands.execute(link, notifCommand);

    // 2. Task pending — approve/cancel takes priority.
    const pending = await this.tasks.findPending(conversation.id);
    if (pending) {
      const decision = await this.taskFlow.handleDecision(link, pending, rawText);
      if (decision) return { body: decision };
      // User is editing/discussing the draft — show it with action buttons.
      const reply = await this.orchestrator.respond(link, conversation, rawText, inboundMessageId, pending);
      const body = reply === REPLIES.notConfigured ? this.taskFlow.pendingReminder(pending) : reply;
      return { body, buttons: TASK_BUTTONS };
    }

    // 3. Translate button IDs to natural-language queries before intent/AI routing.
    const text = this.intents.resolveButtonId(rawText);

    // 4. Intent tier (free, instant, no AI call).
    const intentReply = this.intents.match(text);
    if (intentReply) return intentReply;

    // 5. AI tier with context-aware button post-processing.
    const aiText = await this.orchestrator.respond(link, conversation, text, inboundMessageId);
    return this.postProcessAiReply(aiText);
  }

  /**
   * Attach context-aware quick-reply buttons to an AI response based on the
   * topic of the reply, so the user can naturally continue the conversation.
   */
  private postProcessAiReply(text: string): OutboundReply {
    if (SNAPSHOT_RE.test(text)) return { body: text, buttons: SNAPSHOT_BUTTONS };
    if (DRAFT_RE.test(text))    return { body: text, buttons: TASK_BUTTONS };
    if (INVOICE_RE.test(text))  return { body: text, buttons: INVOICE_BUTTONS };
    if (SALES_RE.test(text))    return { body: text, buttons: SALES_BUTTONS };
    if (STOCK_RE.test(text))    return { body: text, buttons: STOCK_BUTTONS };
    return { body: text };
  }

  async queueReply(conversation: Conversation, reply: OutboundReply): Promise<void> {
    if (reply.buttons?.length) {
      await this.queueOutboundInteractive(conversation, reply.body, reply.buttons);
    } else {
      await this.queueOutboundText(conversation, reply.body);
    }
  }

  /** @deprecated Use queueReply */
  async queueOutbound(conversation: Conversation, _to: string, body: string): Promise<void> {
    await this.queueOutboundText(conversation, body);
  }

  private async queueOutboundText(conversation: Conversation, body: string): Promise<void> {
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUT,
        type: 'text',
        body,
        status: ChatMessageStatus.QUEUED,
      },
    });
    await this.whatsappQueue.add('send-text', { messageId: message.id });
  }

  private async queueOutboundInteractive(
    conversation: Conversation,
    body: string,
    buttons: [QuickReply, ...QuickReply[]],
  ): Promise<void> {
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUT,
        type: 'interactive',
        body,
        payload: { buttons } as object,
        status: ChatMessageStatus.QUEUED,
      },
    });
    await this.whatsappQueue.add('send-interactive', { messageId: message.id });
  }

  private async handleUnlinkedNumber(inbound: InboundText): Promise<void> {
    const match = LINK_COMMAND_REGEX.exec(inbound.text.trim());
    if (!match) {
      this.logger.debug(`Ignoring message from unlinked number ending ${inbound.from.slice(-4)}`);
      return;
    }
    const result = await this.links.redeemLinkToken(inbound.from, match[1]);
    if (!result) {
      this.logger.debug(`Rejected LINK attempt from number ending ${inbound.from.slice(-4)}`);
      return;
    }
    const conversation = await this.getOrCreateActiveConversation(result.link);
    await this.persistInbound(conversation, inbound);
    await this.queueOutboundText(conversation, LINKED_REPLY);
  }

  private async getOrCreateActiveConversation(link: UserChannelLink): Promise<Conversation> {
    const existing = await this.prisma.conversation.findFirst({
      where: { userChannelLinkId: link.id, status: ConversationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: { companyId: link.companyId, userChannelLinkId: link.id },
    });
  }

  private async persistInbound(conversation: Conversation, inbound: InboundText) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: MessageDirection.IN,
          waMessageId: inbound.waMessageId || null,
          body: inbound.text,
          status: ChatMessageStatus.RECEIVED,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: inbound.timestamp ?? new Date() },
      }),
    ]);
    return message;
  }
}

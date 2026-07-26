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
import type { OutboundReply, QuickReply } from '../channels/channel-adapter.interface';
import { IntentService } from '../intent/intent.service';
import { LinkService } from '../link/link.service';
import { AgentTaskService } from '../tasks/agent-task.service';
import { TaskFlowService } from '../tasks/task-flow.service';

export type InboundText = {
  waMessageId: string;
  /** Sender in Meta's format: E.164 digits without "+". */
  from: string;
  text: string;
  timestamp?: Date;
};

export type WhatsAppSendJob = { messageId: string };

const LINKED_REPLY =
  '✅ WhatsApp linked successfully.\n\nWelcome! ' +
  'Ask me about stock, sales, low stock, top sellers, or what to reorder — in plain language.';

/** "LINK V1-ABCD2345" or "LINK ABCD2345" (prefix optional), case-insensitive. */
const LINK_COMMAND_REGEX = /^LINK\s+((?:V1-)?[A-Z0-9]{6,12})$/i;

/**
 * Detect AI replies that look like a business snapshot (multiple ERP metric
 * lines) so we can append quick-reply buttons for convenient follow-ups.
 */
const SNAPSHOT_REPLY_RE =
  /(?:business\s+snapshot|📊|(?:orders?|revenue|low[\s-]?stock|overdue).*(?:orders?|revenue|low[\s-]?stock|overdue))/is;

const SNAPSHOT_FOLLOW_UP_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'snapshot', title: '📊 Get latest' },
  { id: 'low_stock', title: '📦 Low stock' },
  { id: 'revenue', title: '💰 Revenue' },
];

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
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue<WhatsAppSendJob>,
  ) {}

  /** Webhook entry point for an inbound WhatsApp text message. */
  async handleInboundText(inbound: InboundText): Promise<void> {
    // Meta redelivers webhooks; wa_message_id is the idempotency key.
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
    // Fire-and-forget: return 200 to Meta immediately; AI runs in background.
    void this.links
      .touchLastSeen(link)
      .then(() => this.buildReply(link, conversation, inbound.text, inboundMessage.id))
      .then((reply) => this.queueReply(conversation, reply))
      .catch((err: Error) =>
        this.logger.error(`Conversation turn failed for link ${link.id}: ${err.message}`),
      );
  }

  /**
   * Reply routing. With a task pending, approve/cancel is handled directly and
   * anything else goes to the AI with the draft in context (the "edit" path) —
   * the rule tier is bypassed so "ok"-style smalltalk can't be misread while a
   * decision is pending. Without one: rule tier first (free, instant), then AI.
   */
  private async buildReply(
    link: UserChannelLink,
    conversation: Conversation,
    text: string,
    inboundMessageId: string,
  ): Promise<OutboundReply> {
    const pending = await this.tasks.findPending(conversation.id);
    if (pending) {
      const decision = await this.taskFlow.handleDecision(link, pending, text);
      if (decision) return { body: decision };
      const reply = await this.orchestrator.respond(link, conversation, text, inboundMessageId, pending);
      const body =
        reply === REPLIES.notConfigured ? this.taskFlow.pendingReminder(pending) : reply;
      return { body };
    }
    return (
      this.intents.match(text) ??
      this.postProcessAiReply(
        await this.orchestrator.respond(link, conversation, text, inboundMessageId),
      )
    );
  }

  /**
   * Wrap an AI-generated reply as OutboundReply. If the text looks like a
   * business snapshot, attach quick-reply buttons so the user can easily ask
   * for a refresh or drill into details.
   */
  private postProcessAiReply(text: string): OutboundReply {
    if (SNAPSHOT_REPLY_RE.test(text)) {
      return { body: text, buttons: SNAPSHOT_FOLLOW_UP_BUTTONS };
    }
    return { body: text };
  }

  /**
   * Persist an OUT message and queue the actual send (retried by BullMQ).
   * Sends as interactive (with buttons) when the reply includes them,
   * otherwise falls back to plain text.
   */
  async queueReply(conversation: Conversation, reply: OutboundReply): Promise<void> {
    if (reply.buttons?.length) {
      await this.queueOutboundInteractive(conversation, reply.body, reply.buttons);
    } else {
      await this.queueOutboundText(conversation, reply.body);
    }
  }

  /** @deprecated Use queueReply — kept for any external callers. */
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
      // Unknown number without a LINK command: stay silent (no account enumeration, no spam loop).
      this.logger.debug(`Ignoring message from unlinked number ending ${inbound.from.slice(-4)}`);
      return;
    }
    const result = await this.links.redeemLinkToken(inbound.from, match[1]);
    if (!result) {
      // Invalid/expired/foreign token: silent too — a rejection reply would confirm the endpoint.
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

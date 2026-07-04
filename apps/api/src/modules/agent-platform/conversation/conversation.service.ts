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
  '✅ Your WhatsApp is now linked to your ERP account. ' +
  'Ask me about stock, sales, low stock, top sellers, or what to reorder — in plain language.';

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
    await this.prisma.userChannelLink.update({
      where: { id: link.id },
      data: { lastSeenAt: new Date() },
    });

    const reply = await this.buildReply(link, conversation, inbound.text, inboundMessage.id);
    await this.queueOutbound(conversation, inbound.from, reply);
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
  ): Promise<string> {
    const pending = await this.tasks.findPending(conversation.id);
    if (pending) {
      const decision = await this.taskFlow.handleDecision(link, pending, text);
      if (decision) return decision;
      const reply = await this.orchestrator.respond(link, conversation, text, inboundMessageId, pending);
      // AI unavailable: never leave the user without their pending decision.
      return reply === REPLIES.notConfigured ? this.taskFlow.pendingReminder(pending) : reply;
    }
    return (
      this.intents.match(text) ??
      (await this.orchestrator.respond(link, conversation, text, inboundMessageId))
    );
  }

  /** Persist an OUT message and queue the actual send (retried by BullMQ). */
  async queueOutbound(conversation: Conversation, to: string, body: string): Promise<void> {
    void to; // destination is resolved from the conversation's link at send time
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUT,
        body,
        status: ChatMessageStatus.QUEUED,
      },
    });
    await this.whatsappQueue.add('send-text', { messageId: message.id });
  }

  private async handleUnlinkedNumber(inbound: InboundText): Promise<void> {
    const link = await this.links.verifyInboundCode(inbound.from, inbound.text);
    if (!link) {
      // Unknown number without a valid code: stay silent (no account enumeration, no spam loop).
      this.logger.debug(`Ignoring message from unlinked number ending ${inbound.from.slice(-4)}`);
      return;
    }
    const conversation = await this.getOrCreateActiveConversation(link);
    await this.persistInbound(conversation, inbound);
    await this.queueOutbound(conversation, inbound.from, LINKED_REPLY);
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

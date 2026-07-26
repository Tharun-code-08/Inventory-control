import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ChatMessageStatus } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { JobFailureService } from '@/common/queues/job-failure.service';
import { MetricsService } from '@/common/observability/metrics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsAppAdapter } from '../channels/whatsapp/whatsapp.adapter';
import type { QuickReply } from '../channels/channel-adapter.interface';
import type { WhatsAppSendJob } from './conversation.service';

type InteractivePayload = { buttons: QuickReply[] };

@Processor('whatsapp')
export class ConversationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: WhatsAppAdapter,
    private readonly failures: JobFailureService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(
    job: Job<WhatsAppSendJob>,
  ): Promise<{ sent: boolean; providerMessageId?: string | null }> {
    const message = await this.prisma.message.findUnique({
      where: { id: job.data.messageId },
      include: { conversation: { include: { userChannelLink: true } } },
    });
    if (!message || message.status === ChatMessageStatus.SENT) {
      return { sent: false };
    }

    if (!this.adapter.isConfigured()) {
      const error = 'WhatsApp adapter not configured; message not sent';
      await this.markFailed(message.id, error);
      throw new UnrecoverableError(error);
    }

    const phoneNumber = message.conversation.userChannelLink.phoneNumber;
    const body = message.body ?? '';
    let result: { providerMessageId: string | null };

    if (job.name === 'send-interactive' && message.type === 'interactive') {
      const payload = message.payload as InteractivePayload | null;
      const buttons = payload?.buttons ?? [];
      if (buttons.length === 0) {
        // Buttons missing — degrade to plain text gracefully.
        this.logger.warn(`Interactive message ${message.id} has no buttons; falling back to text`);
        result = await this.adapter.sendText({ to: phoneNumber, body });
      } else {
        result = await this.adapter.sendInteractive({
          to: phoneNumber,
          body,
          buttons: buttons as [QuickReply, ...QuickReply[]],
        });
      }
    } else {
      result = await this.adapter.sendText({ to: phoneNumber, body });
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: { status: ChatMessageStatus.SENT, waMessageId: result.providerMessageId, error: null },
    });
    return { sent: true, providerMessageId: result.providerMessageId };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<WhatsAppSendJob>) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration
      .labels('whatsapp', String(job.name), 'completed')
      .observe(Math.max(0, durationSec));
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<WhatsAppSendJob>, err: Error) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration
      .labels('whatsapp', String(job.name), 'failed')
      .observe(Math.max(0, durationSec));
    await this.failures.record(job, err);
    await this.markFailed(job.data.messageId, err.message).catch(() => undefined);
  }

  private async markFailed(messageId: string, error: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { status: ChatMessageStatus.FAILED, error },
    });
  }
}

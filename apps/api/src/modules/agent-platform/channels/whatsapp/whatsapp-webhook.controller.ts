import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { SkipEnvelope } from '@/common/decorators/skip-envelope.decorator';
import { ConversationService } from '../../conversation/conversation.service';
import { verifyMetaSignature } from './whatsapp-signature.util';

type MetaWebhookMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  /** Quick-reply button tap. */
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
  };
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: { messages?: MetaWebhookMessage[] };
    }>;
  }>;
};

/** Types that are non-text but deserve a friendly acknowledgment. */
const MEDIA_TYPES = new Set(['audio', 'image', 'video', 'document', 'sticker', 'location', 'contacts']);

@ApiTags('Agent Platform')
@Controller('agent-platform/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly conversations: ConversationService,
  ) {}

  /** Meta subscription handshake: echo hub.challenge as plain text. */
  @Public()
  @SkipEnvelope()
  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verify challenge' })
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const expected = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN')?.trim();
    if (mode === 'subscribe' && expected && token === expected) {
      return challenge ?? '';
    }
    throw new ForbiddenException('Webhook verification failed');
  }

  /** Inbound events. Signature is verified on the raw body before parsing. */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Meta webhook receiver (signed)' })
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ received: boolean }> {
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET')?.trim() ?? '';
    if (!req.rawBody || !verifyMetaSignature(req.rawBody, signature, appSecret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = req.body as MetaWebhookPayload;
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          if (!message.from) continue;

          const ts = message.timestamp
            ? new Date(Number(message.timestamp) * 1000)
            : undefined;

          try {
            if (message.type === 'text' && message.text?.body) {
              // Plain text message.
              await this.conversations.handleInboundText({
                waMessageId: message.id ?? '',
                from: message.from,
                text: message.text.body,
                timestamp: ts,
              });
            } else if (
              message.type === 'interactive' &&
              message.interactive?.type === 'button_reply'
            ) {
              // Button tap: use the machine-readable ID as inbound text so the
              // conversation layer can translate it to a natural-language query
              // or route it to the approval flow (id="approve"/"cancel").
              const buttonId = message.interactive.button_reply?.id?.trim();
              if (buttonId) {
                await this.conversations.handleInboundText({
                  waMessageId: message.id ?? '',
                  from: message.from,
                  text: buttonId,
                  timestamp: ts,
                });
              }
            } else if (message.type && MEDIA_TYPES.has(message.type)) {
              // Voice note, image, document, etc. — acknowledge gracefully.
              await this.conversations.handleInboundMedia({
                waMessageId: message.id ?? '',
                from: message.from,
                mediaType: message.type,
                timestamp: ts,
              });
            }
          } catch (err) {
            // Never fail the webhook for one bad message — Meta would retry the whole batch.
            this.logger.error(
              `Failed to process inbound message ${message.id ?? '<no id>'}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }
      }
    }
    return { received: true };
  }
}

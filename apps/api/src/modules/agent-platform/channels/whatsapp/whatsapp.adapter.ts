import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatChannel } from '@prisma/client';
import type { ChannelAdapter, OutboundText, SendResult } from '../channel-adapter.interface';

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number; type?: string };
};

/**
 * Meta WhatsApp Cloud API adapter. Credentials come from env (the shared
 * platform number for MVP); per-tenant ChannelAccount rows take over later.
 */
@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = ChatChannel.WHATSAPP;

  private readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.phoneNumberId() && this.accessToken());
  }

  async sendText(message: OutboundText): Promise<SendResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'WhatsApp adapter is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing)',
      );
    }

    const url = `${this.apiUrl()}/${this.phoneNumberId()}/messages`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.accessToken()}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.to,
          type: 'text',
          text: { preview_url: false, body: message.body },
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as MetaSendResponse;
      if (!res.ok) {
        throw new Error(
          `Meta send failed (${res.status}): ${payload.error?.message ?? 'unknown error'}`,
        );
      }
      return { providerMessageId: payload.messages?.[0]?.id ?? null };
    } finally {
      clearTimeout(timeout);
    }
  }

  private apiUrl(): string {
    return (
      this.config.get<string>('WHATSAPP_API_URL')?.trim().replace(/\/+$/, '') ||
      'https://graph.facebook.com/v20.0'
    );
  }

  private phoneNumberId(): string {
    return this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim() ?? '';
  }

  private accessToken(): string {
    return this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim() ?? '';
  }

  private timeoutMs(): number {
    return Number(this.config.get<string | number>('NOTIFICATIONS_TIMEOUT_MS') ?? 5_000);
  }
}

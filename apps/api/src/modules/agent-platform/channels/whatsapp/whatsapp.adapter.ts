import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatChannel } from '@prisma/client';
import type { ChannelAdapter, OutboundInteractive, OutboundText, SendResult } from '../channel-adapter.interface';

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number; type?: string };
};

/** A pre-approved WhatsApp template send (business-initiated, outside the 24h window). */
export type OutboundTemplate = {
  /** Destination E.164 digits, no "+". */
  to: string;
  /** Meta-approved template name. */
  name: string;
  /** Must match the approved template's language exactly, e.g. "en" / "en_US". */
  languageCode: string;
  /**
   * Full Meta `components` array. Callers build the exact shape the approved
   * template requires (body parameters, buttons, …); the adapter stays
   * template-agnostic. Omit for a template with no parameters.
   */
  components?: unknown[];
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
    return this.postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: 'text',
      text: { preview_url: false, body: message.body },
    });
  }

  /**
   * Send an interactive button message (up to 3 quick-reply buttons). Meta
   * requires the 24h service window to be open; use sendTemplate for
   * business-initiated sends outside that window.
   */
  async sendInteractive(message: OutboundInteractive): Promise<SendResult> {
    const buttons = message.buttons.slice(0, 3).map((b) => ({
      type: 'reply',
      reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
    }));
    return this.postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: message.body },
        action: { buttons },
      },
    });
  }

  /**
   * Send a pre-approved template message. Required for business-initiated
   * sends (OTP, alerts) outside the 24h service window — Meta rejects plain
   * text there. See docs/event-platform/provider-capability-matrix.md.
   */
  async sendTemplate(message: OutboundTemplate): Promise<SendResult> {
    return this.postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: 'template',
      template: {
        name: message.name,
        language: { code: message.languageCode },
        ...(message.components && message.components.length
          ? { components: message.components }
          : {}),
      },
    });
  }

  private async postMessage(body: Record<string, unknown>): Promise<SendResult> {
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
        body: JSON.stringify(body),
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

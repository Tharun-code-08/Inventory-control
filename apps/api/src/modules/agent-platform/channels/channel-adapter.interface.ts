import type { ChatChannel } from '@prisma/client';

export type OutboundText = {
  /** Destination identity on the channel (WhatsApp: E.164 digits, no "+"). */
  to: string;
  body: string;
};

/** A WhatsApp quick-reply button (title ≤ 20 chars, id ≤ 256 chars). */
export type QuickReply = { id: string; title: string };

/** An interactive button message — body text + 1–3 quick-reply buttons. */
export type OutboundInteractive = {
  to: string;
  body: string;
  /** 1–3 quick-reply buttons. Meta rejects more than 3. */
  buttons: [QuickReply, ...QuickReply[]];
};

/** Caller-facing reply shape: plain text or text + quick-reply buttons. */
export type OutboundReply =
  | { body: string; buttons?: undefined }
  | { body: string; buttons: [QuickReply, ...QuickReply[]] };

export type SendResult = {
  /** Provider-assigned message id (Meta: `wamid...`), if returned. */
  providerMessageId: string | null;
};

/**
 * A messaging channel the Agent Platform can send through. WhatsApp (Meta
 * Cloud API) is the first implementation; Telegram/Slack/web-chat slot in
 * later behind this same interface — the conversation core never talks to a
 * provider SDK/API directly.
 */
export interface ChannelAdapter {
  readonly channel: ChatChannel;

  /** True when credentials are present and sends can be attempted. */
  isConfigured(): boolean;

  sendText(message: OutboundText): Promise<SendResult>;
}

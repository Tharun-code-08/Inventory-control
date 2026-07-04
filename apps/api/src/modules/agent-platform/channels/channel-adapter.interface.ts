import type { ChatChannel } from '@prisma/client';

export type OutboundText = {
  /** Destination identity on the channel (WhatsApp: E.164 digits, no "+"). */
  to: string;
  body: string;
};

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

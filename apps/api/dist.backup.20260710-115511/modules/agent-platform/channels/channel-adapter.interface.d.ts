import type { ChatChannel } from '@prisma/client';
export type OutboundText = {
    to: string;
    body: string;
};
export type SendResult = {
    providerMessageId: string | null;
};
export interface ChannelAdapter {
    readonly channel: ChatChannel;
    isConfigured(): boolean;
    sendText(message: OutboundText): Promise<SendResult>;
}

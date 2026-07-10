import { ConfigService } from '@nestjs/config';
import type { ChannelAdapter, OutboundText, SendResult } from '../channel-adapter.interface';
export type OutboundTemplate = {
    to: string;
    name: string;
    languageCode: string;
    components?: unknown[];
};
export declare class WhatsAppAdapter implements ChannelAdapter {
    private readonly config;
    readonly channel: "WHATSAPP";
    private readonly logger;
    constructor(config: ConfigService);
    isConfigured(): boolean;
    sendText(message: OutboundText): Promise<SendResult>;
    sendTemplate(message: OutboundTemplate): Promise<SendResult>;
    private postMessage;
    private apiUrl;
    private phoneNumberId;
    private accessToken;
    private timeoutMs;
}

import { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ConversationService } from '../../conversation/conversation.service';
export declare class WhatsAppWebhookController {
    private readonly config;
    private readonly conversations;
    private readonly logger;
    constructor(config: ConfigService, conversations: ConversationService);
    verify(mode?: string, token?: string, challenge?: string): string;
    receive(req: RawBodyRequest<Request>, signature?: string): Promise<{
        received: boolean;
    }>;
}

import { ConfigService } from '@nestjs/config';
import type { AiConversationRequest, AiConversationResult, AiProvider } from './ai-provider.interface';
export declare class DeepSeekProvider implements AiProvider {
    private readonly config;
    readonly name = "deepseek";
    private readonly logger;
    constructor(config: ConfigService);
    isConfigured(): boolean;
    runConversation(request: AiConversationRequest): Promise<AiConversationResult>;
    private executeToolCall;
    private chatCompletion;
    private baseUrl;
    private apiKey;
    private requestTimeoutMs;
}

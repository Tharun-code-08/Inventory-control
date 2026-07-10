export type AiRole = 'intent' | 'reasoning' | 'escalation';
export type AiToolDef = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
};
export type AiToolCall = {
    id: string;
    name: string;
    input: Record<string, unknown>;
};
export type AiToolResult = {
    content: string;
    isError?: boolean;
};
export type AiHistoryTurn = {
    role: 'user' | 'assistant';
    text: string;
};
export type AiConversationRequest = {
    model: string;
    system: string;
    maxTokens: number;
    history: AiHistoryTurn[];
    userMessage: string;
    tools: AiToolDef[];
    executeTool: (call: AiToolCall) => Promise<AiToolResult>;
    maxToolRounds: number;
};
export type AiConversationResult = {
    text: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    toolCallCount: number;
    toolErrorCount: number;
    toolRounds: number;
    stopReason: string | null;
};
export interface AiProvider {
    readonly name: string;
    isConfigured(): boolean;
    runConversation(request: AiConversationRequest): Promise<AiConversationResult>;
}

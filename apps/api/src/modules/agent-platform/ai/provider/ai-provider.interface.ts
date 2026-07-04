/**
 * Provider-agnostic AI contract. The orchestrator, tool registry, and
 * conversation core depend only on these types — an OpenAI/Gemini/Anthropic
 * provider slots in later without touching them. The provider owns the
 * agentic tool loop internally (message/wire formats are provider-specific);
 * tool execution is delegated back through `executeTool`.
 */

export type AiRole = 'intent' | 'reasoning' | 'escalation';

export type AiToolDef = {
  name: string;
  description: string;
  /** JSON Schema for the tool input. */
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
  /** Prior turns, oldest first. The provider normalizes role alternation. */
  history: AiHistoryTurn[];
  userMessage: string;
  tools: AiToolDef[];
  executeTool: (call: AiToolCall) => Promise<AiToolResult>;
  maxToolRounds: number;
};

export type AiConversationResult = {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiConversationRequest,
  AiConversationResult,
  AiProvider,
  AiToolResult,
} from './ai-provider.interface';

/** OpenAI-compatible chat-completions wire types (the subset DeepSeek uses). */
type WireToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type WireMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: WireToolCall[];
  tool_call_id?: string;
};

type WireResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: WireToolCall[];
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string };
};

/**
 * DeepSeek provider — first production implementation of `AiProvider`.
 * DeepSeek exposes an OpenAI-compatible chat-completions API with function
 * calling, so this is plain `fetch` against `{AI_BASE_URL}/chat/completions`
 * (no SDK dependency). Reads the provider-neutral AI_* env keys. The agentic
 * tool loop lives here; tool execution is delegated back to the orchestrator
 * via `executeTool`.
 */
@Injectable()
export class DeepSeekProvider implements AiProvider {
  readonly name = 'deepseek';

  private readonly logger = new Logger(DeepSeekProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey());
  }

  async runConversation(request: AiConversationRequest): Promise<AiConversationResult> {
    const apiKey = this.apiKey();
    if (!apiKey) {
      throw new Error('DeepSeek provider is not configured (AI_API_KEY missing)');
    }

    const usage = { inputTokens: 0, outputTokens: 0 };
    let toolCallCount = 0;
    let toolErrorCount = 0;
    let rounds = 0;

    const tools = request.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
    const messages: WireMessage[] = [
      { role: 'system', content: request.system },
      ...request.history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: 'user', content: request.userMessage },
    ];

    for (;;) {
      const response = await this.chatCompletion({
        model: request.model,
        max_tokens: request.maxTokens,
        messages,
        ...(tools.length ? { tools } : {}),
      });
      usage.inputTokens += response.usage?.prompt_tokens ?? 0;
      usage.outputTokens += response.usage?.completion_tokens ?? 0;

      const choice = response.choices?.[0];
      const toolCalls = choice?.message?.tool_calls ?? [];

      if (toolCalls.length === 0 || rounds >= request.maxToolRounds) {
        return {
          text: (choice?.message?.content ?? '').trim(),
          usage,
          toolCallCount,
          toolErrorCount,
          toolRounds: rounds,
          stopReason: choice?.finish_reason ?? null,
        };
      }

      // Replay only the fields the API accepts back (never reasoning traces).
      messages.push({
        role: 'assistant',
        content: choice?.message?.content ?? null,
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        toolCallCount += 1;
        const result = await this.executeToolCall(request, call);
        if (result.isError) toolErrorCount += 1;
        messages.push({ role: 'tool', tool_call_id: call.id, content: result.content });
      }
      rounds += 1;
    }
  }

  private async executeToolCall(
    request: AiConversationRequest,
    call: WireToolCall,
  ): Promise<AiToolResult> {
    let input: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(call.function.arguments || '{}');
      input = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {
        content: `Invalid JSON arguments for tool ${call.function.name}`,
        isError: true,
      };
    }
    return request.executeTool({ id: call.id, name: call.function.name, input });
  }

  private async chatCompletion(body: Record<string, unknown>): Promise<WireResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs());
    try {
      const res = await fetch(`${this.baseUrl()}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey()}`,
        },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as WireResponse;
      if (!res.ok) {
        throw new Error(
          `DeepSeek request failed (${res.status}): ${payload.error?.message ?? 'unknown error'}`,
        );
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  private baseUrl(): string {
    return (
      this.config.get<string>('AI_BASE_URL')?.trim().replace(/\/+$/, '') ||
      'https://api.deepseek.com'
    );
  }

  private apiKey(): string {
    return this.config.get<string>('AI_API_KEY')?.trim() ?? '';
  }

  private requestTimeoutMs(): number {
    return Number(this.config.get('AI_REQUEST_TIMEOUT_MS') ?? 60_000);
  }
}

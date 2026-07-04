import { DeepSeekProvider } from './deepseek.provider';
import type { AiConversationRequest } from './ai-provider.interface';

function buildProvider(configValues: Record<string, unknown> = { AI_API_KEY: 'sk-test' }) {
  const config = { get: jest.fn((key: string) => configValues[key]) };
  return new DeepSeekProvider(config as never);
}

function chatResponse(body: {
  content?: string | null;
  toolCalls?: Array<{ id: string; name: string; args: string }>;
  finishReason?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}) {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: body.content ?? null,
            ...(body.toolCalls
              ? {
                  tool_calls: body.toolCalls.map((c) => ({
                    id: c.id,
                    type: 'function',
                    function: { name: c.name, arguments: c.args },
                  })),
                }
              : {}),
          },
          finish_reason: body.finishReason ?? 'stop',
        },
      ],
      usage: body.usage ?? { prompt_tokens: 10, completion_tokens: 5 },
    }),
  } as Response;
}

function baseRequest(overrides: Partial<AiConversationRequest> = {}): AiConversationRequest {
  return {
    model: 'deepseek-chat',
    system: 'You are a test assistant.',
    maxTokens: 512,
    history: [],
    userMessage: 'how much stock?',
    tools: [
      {
        name: 'check_stock',
        description: 'stock',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
      },
    ],
    executeTool: jest.fn().mockResolvedValue({ content: '[{"totalStock":42}]' }),
    maxToolRounds: 3,
    ...overrides,
  };
}

describe('DeepSeekProvider', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is unconfigured without AI_API_KEY and refuses to run', async () => {
    const provider = buildProvider({});
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.runConversation(baseRequest())).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns text and accumulated usage for a plain answer', async () => {
    const provider = buildProvider();
    fetchMock.mockResolvedValueOnce(
      chatResponse({ content: '42 pens in stock.', usage: { prompt_tokens: 100, completion_tokens: 20 } }),
    );

    const result = await provider.runConversation(baseRequest());

    expect(result.text).toBe('42 pens in stock.');
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20 });
    expect(result.toolCallCount).toBe(0);
    expect(result.stopReason).toBe('stop');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    const sent = JSON.parse(String(init.body));
    expect(sent.model).toBe('deepseek-chat');
    expect(sent.messages[0]).toEqual({ role: 'system', content: 'You are a test assistant.' });
    expect(sent.tools[0].function.name).toBe('check_stock');
  });

  it('runs the tool loop: executes tool calls and feeds results back', async () => {
    const provider = buildProvider();
    fetchMock
      .mockResolvedValueOnce(
        chatResponse({
          toolCalls: [{ id: 'call_1', name: 'check_stock', args: '{"query":"pens"}' }],
          finishReason: 'tool_calls',
          usage: { prompt_tokens: 100, completion_tokens: 30 },
        }),
      )
      .mockResolvedValueOnce(
        chatResponse({ content: 'There are 42 pens.', usage: { prompt_tokens: 150, completion_tokens: 10 } }),
      );

    const request = baseRequest();
    const result = await provider.runConversation(request);

    expect(request.executeTool).toHaveBeenCalledWith({
      id: 'call_1',
      name: 'check_stock',
      input: { query: 'pens' },
    });
    expect(result.text).toBe('There are 42 pens.');
    expect(result.toolCallCount).toBe(1);
    expect(result.toolErrorCount).toBe(0);
    expect(result.usage).toEqual({ inputTokens: 250, outputTokens: 40 });

    // Second request must replay the assistant tool_calls turn + tool result.
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body));
    const roles = secondBody.messages.map((m: { role: string }) => m.role);
    expect(roles).toEqual(['system', 'user', 'assistant', 'tool']);
    expect(secondBody.messages[3]).toEqual({
      role: 'tool',
      tool_call_id: 'call_1',
      content: '[{"totalStock":42}]',
    });
  });

  it('feeds an error tool-result back on malformed tool arguments', async () => {
    const provider = buildProvider();
    fetchMock
      .mockResolvedValueOnce(
        chatResponse({
          toolCalls: [{ id: 'call_1', name: 'check_stock', args: '{not json' }],
          finishReason: 'tool_calls',
        }),
      )
      .mockResolvedValueOnce(chatResponse({ content: 'Sorry, retry?' }));

    const request = baseRequest();
    const result = await provider.runConversation(request);

    expect(request.executeTool).not.toHaveBeenCalled();
    expect(result.toolErrorCount).toBe(1);
    expect(result.text).toBe('Sorry, retry?');
  });

  it('throws a clear error on non-2xx responses', async () => {
    const provider = buildProvider();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    } as Response);

    await expect(provider.runConversation(baseRequest())).rejects.toThrow(
      /DeepSeek request failed \(401\): Invalid API key/,
    );
  });

  it('stops looping at maxToolRounds and returns the last text', async () => {
    const provider = buildProvider();
    fetchMock.mockResolvedValue(
      chatResponse({
        content: 'still working',
        toolCalls: [{ id: 'c', name: 'check_stock', args: '{}' }],
        finishReason: 'tool_calls',
      }),
    );

    const result = await provider.runConversation(baseRequest({ maxToolRounds: 2 }));
    // rounds 0 and 1 execute tools; the third response is returned as-is.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.toolCallCount).toBe(2);
    expect(result.text).toBe('still working');
  });
});

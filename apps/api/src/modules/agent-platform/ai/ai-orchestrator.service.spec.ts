import type { Conversation, UserChannelLink } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user';
import { AiOrchestratorService, REPLIES } from './ai-orchestrator.service';
import type { AiConversationRequest, AiConversationResult } from './provider/ai-provider.interface';
import { ToolRegistry } from './tools/tool-registry';

const link = { id: 'link-1', userId: 'u1', companyId: 'c1' } as UserChannelLink;
const conversation = { id: 'conv-1', summary: null } as Conversation;

const requestUser: RequestUser = {
  id: 'u1',
  email: 'u@example.com',
  role: 'STAFF' as RequestUser['role'],
  shopId: 's1',
  companyId: 'c1',
  tenantShopIds: ['s1'],
  permissions: ['product:read'],
};

const resolvedSettings = {
  provider: 'deepseek',
  models: { intent: 'intent-model', reasoning: 'reasoning-model', escalation: 'escalation-model' },
  featureFlags: { stock: true, sales: true, purchase: true },
  dailyRequestLimit: 100,
  monthlyTokenLimit: null,
  monthlyCostCentsLimit: null,
  systemPrompt: null,
  promptVersion: 0,
};

function buildHarness(options?: { providerResult?: Partial<AiConversationResult> }) {
  const registry = new ToolRegistry();
  const stockHandler = jest.fn().mockResolvedValue([{ productCode: 'PEN-01', totalStock: 42 }]);
  registry.register({
    name: 'check_stock',
    description: 'stock',
    inputSchema: { type: 'object', properties: {} },
    requiredPermission: 'product:read',
    featureFlag: 'stock',
    handler: stockHandler,
  });
  registry.register({
    name: 'sales_overview',
    description: 'sales',
    inputSchema: { type: 'object', properties: {} },
    requiredPermission: 'report:view',
    featureFlag: 'sales',
    handler: jest.fn(),
  });

  const provider = {
    name: 'deepseek',
    isConfigured: jest.fn().mockReturnValue(true),
    runConversation: jest.fn(
      async (req: AiConversationRequest): Promise<AiConversationResult> => ({
        text: 'There are 42 pens in stock.',
        usage: { inputTokens: 1000, outputTokens: 200 },
        toolCallCount: 1,
        toolErrorCount: 0,
        toolRounds: 1,
        stopReason: 'end_turn',
        ...options?.providerResult,
      }),
    ),
  };
  const prisma = { message: { findMany: jest.fn().mockResolvedValue([]) } };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const settings = { forCompany: jest.fn().mockResolvedValue(resolvedSettings) };
  const usage = {
    check: jest.fn().mockResolvedValue({ allowed: true }),
    record: jest.fn().mockResolvedValue(undefined),
  };
  const links = { buildRequestUser: jest.fn().mockResolvedValue(requestUser) };

  const health = {
    isOpen: jest.fn().mockReturnValue(false),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
  };
  const service = new AiOrchestratorService(
    prisma as never,
    config as never,
    provider as never,
    registry,
    settings as never,
    usage as never,
    links as never,
    health as never,
  );
  return { service, provider, usage, settings, links, prisma, stockHandler };
}

describe('AiOrchestratorService.respond', () => {
  it('short-circuits with a config message when the provider has no key', async () => {
    const h = buildHarness();
    h.provider.isConfigured.mockReturnValue(false);
    await expect(h.service.respond(link, conversation, 'stock of pens')).resolves.toBe(
      REPLIES.notConfigured,
    );
    expect(h.provider.runConversation).not.toHaveBeenCalled();
    expect(h.usage.record).not.toHaveBeenCalled();
  });

  it('short-circuits on quota breach BEFORE any provider call', async () => {
    const h = buildHarness();
    h.usage.check.mockResolvedValue({ allowed: false, reason: 'daily_requests' });
    await expect(h.service.respond(link, conversation, 'stock of pens')).resolves.toBe(
      REPLIES.quotaReached,
    );
    expect(h.provider.runConversation).not.toHaveBeenCalled();
  });

  it('refuses service when the linked account is inactive', async () => {
    const h = buildHarness();
    h.links.buildRequestUser.mockResolvedValue(null);
    await expect(h.service.respond(link, conversation, 'hello')).resolves.toBe(
      REPLIES.accountInactive,
    );
    expect(h.provider.runConversation).not.toHaveBeenCalled();
  });

  it('passes only permitted+enabled tools, uses the configured reasoning model, and meters usage', async () => {
    const h = buildHarness();
    const reply = await h.service.respond(link, conversation, 'stock of pens');

    expect(reply).toBe('There are 42 pens in stock.');
    const req = h.provider.runConversation.mock.calls[0][0] as AiConversationRequest;
    expect(req.model).toBe('reasoning-model');
    // sales_overview requires report:view which the user lacks → hidden.
    expect(req.tools.map((t) => t.name)).toEqual(['check_stock']);

    expect(h.usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        conversationId: 'conv-1',
        model: 'reasoning-model',
        inputTokens: 1000,
        outputTokens: 200,
        toolErrors: 0,
      }),
    );
  });

  it('dispatches tool calls through the registry with the linked user scope', async () => {
    const h = buildHarness();
    let executed: unknown;
    h.provider.runConversation.mockImplementation(async (req: AiConversationRequest) => {
      executed = await req.executeTool({ id: 't1', name: 'check_stock', input: { query: 'pen' } });
      return {
        text: 'done',
        usage: { inputTokens: 1, outputTokens: 1 },
        toolCallCount: 1,
        toolErrorCount: 0,
        toolRounds: 1,
        stopReason: 'end_turn',
      };
    });

    await h.service.respond(link, conversation, 'stock of pens');
    // Handlers receive the immutable per-turn ExecutionContext.
    expect(h.stockHandler).toHaveBeenCalledWith(
      { user: requestUser, companyId: 'c1', conversationId: 'conv-1', linkId: 'link-1' },
      { query: 'pen' },
    );
    expect(executed).toEqual({ content: JSON.stringify([{ productCode: 'PEN-01', totalStock: 42 }]) });
  });

  it('returns an error tool-result for unknown tools and permission gaps', async () => {
    const h = buildHarness();
    const results: unknown[] = [];
    h.provider.runConversation.mockImplementation(async (req: AiConversationRequest) => {
      results.push(await req.executeTool({ id: '1', name: 'nope', input: {} }));
      results.push(await req.executeTool({ id: '2', name: 'sales_overview', input: {} }));
      return {
        text: 'done',
        usage: { inputTokens: 1, outputTokens: 1 },
        toolCallCount: 2,
        toolErrorCount: 2,
        toolRounds: 1,
        stopReason: 'end_turn',
      };
    });

    await h.service.respond(link, conversation, 'anything');
    expect(results[0]).toEqual(expect.objectContaining({ isError: true }));
    expect(results[1]).toEqual(expect.objectContaining({ isError: true }));
  });

  it('degrades to a friendly failure reply and meters a handoff when the provider throws', async () => {
    const h = buildHarness();
    h.provider.runConversation.mockRejectedValue(new Error('api down'));

    await expect(h.service.respond(link, conversation, 'stock of pens')).resolves.toBe(
      REPLIES.failure,
    );
    expect(h.usage.record).toHaveBeenCalledWith(
      expect.objectContaining({ humanHandoff: true, toolErrors: 1 }),
    );
  });

  it('falls back to a canned line when the model returns empty text', async () => {
    const h = buildHarness({ providerResult: { text: '' } });
    await expect(h.service.respond(link, conversation, 'stock of pens')).resolves.toBe(
      REPLIES.empty,
    );
  });
});

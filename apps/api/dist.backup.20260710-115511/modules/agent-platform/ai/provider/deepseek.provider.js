"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DeepSeekProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let DeepSeekProvider = DeepSeekProvider_1 = class DeepSeekProvider {
    config;
    name = 'deepseek';
    logger = new common_1.Logger(DeepSeekProvider_1.name);
    constructor(config) {
        this.config = config;
    }
    isConfigured() {
        return Boolean(this.apiKey());
    }
    async runConversation(request) {
        const apiKey = this.apiKey();
        if (!apiKey) {
            throw new Error('DeepSeek provider is not configured (AI_API_KEY missing)');
        }
        const usage = { inputTokens: 0, outputTokens: 0 };
        let toolCallCount = 0;
        let toolErrorCount = 0;
        let rounds = 0;
        const tools = request.tools.map((tool) => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }));
        const messages = [
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
            messages.push({
                role: 'assistant',
                content: choice?.message?.content ?? null,
                tool_calls: toolCalls,
            });
            for (const call of toolCalls) {
                toolCallCount += 1;
                const result = await this.executeToolCall(request, call);
                if (result.isError)
                    toolErrorCount += 1;
                messages.push({ role: 'tool', tool_call_id: call.id, content: result.content });
            }
            rounds += 1;
        }
    }
    async executeToolCall(request, call) {
        let input;
        try {
            const parsed = JSON.parse(call.function.arguments || '{}');
            input = parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch {
            return {
                content: `Invalid JSON arguments for tool ${call.function.name}`,
                isError: true,
            };
        }
        return request.executeTool({ id: call.id, name: call.function.name, input });
    }
    async chatCompletion(body) {
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
            const payload = (await res.json().catch(() => ({})));
            if (!res.ok) {
                throw new Error(`DeepSeek request failed (${res.status}): ${payload.error?.message ?? 'unknown error'}`);
            }
            return payload;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    baseUrl() {
        return (this.config.get('AI_BASE_URL')?.trim().replace(/\/+$/, '') ||
            'https://api.deepseek.com');
    }
    apiKey() {
        return this.config.get('AI_API_KEY')?.trim() ?? '';
    }
    requestTimeoutMs() {
        return Number(this.config.get('AI_REQUEST_TIMEOUT_MS') ?? 60_000);
    }
};
exports.DeepSeekProvider = DeepSeekProvider;
exports.DeepSeekProvider = DeepSeekProvider = DeepSeekProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DeepSeekProvider);
//# sourceMappingURL=deepseek.provider.js.map
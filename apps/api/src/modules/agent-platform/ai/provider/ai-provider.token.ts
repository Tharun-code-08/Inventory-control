/**
 * DI token for the active AI provider. The orchestrator depends on this token
 * (typed as `AiProvider`), never on a concrete class — switching providers
 * (DeepSeek → OpenAI/Gemini/Anthropic) is a one-line change in the module.
 */
export const AI_PROVIDER = 'AGENT_PLATFORM_AI_PROVIDER';

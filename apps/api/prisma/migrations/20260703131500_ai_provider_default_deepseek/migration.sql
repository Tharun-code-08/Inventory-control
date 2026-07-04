-- Agent Platform Phase 2: DeepSeek replaces Anthropic as the first production
-- AI provider; align the ai_settings.provider column default.
ALTER TABLE "ai_settings" ALTER COLUMN "provider" SET DEFAULT 'deepseek';

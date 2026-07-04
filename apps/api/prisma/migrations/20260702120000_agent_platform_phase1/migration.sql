-- Agent Platform (Phase 1): WhatsApp channel, secure linking, conversations,
-- AI settings/usage. Hand-extracted from `prisma migrate diff` output — the
-- full diff also contained unrelated pre-existing drift (see repo notes),
-- which is deliberately NOT applied here.

-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "ChannelAccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ChannelLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'AWAITING_CONFIRMATION', 'AWAITING_APPROVAL', 'HANDOFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AiModelRole" AS ENUM ('INTENT', 'REASONING', 'ESCALATION');

-- CreateTable
CREATE TABLE "channel_accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "channel" "ChatChannel" NOT NULL DEFAULT 'WHATSAPP',
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "business_account_id" TEXT,
    "phone_number_id" TEXT NOT NULL,
    "display_phone" TEXT,
    "access_token" TEXT,
    "webhook_secret" TEXT,
    "status" "ChannelAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "channel_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_channel_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "channel" "ChatChannel" NOT NULL DEFAULT 'WHATSAPP',
    "phone_number" TEXT NOT NULL,
    "status" "ChannelLinkStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_channel_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "phone_number" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_channel_link_id" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "pending_draft" JSONB,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "wa_message_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "payload" JSONB,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "intent_model" TEXT,
    "reasoning_model" TEXT,
    "escalation_model" TEXT,
    "feature_flags" JSONB NOT NULL DEFAULT '{}',
    "daily_request_limit" INTEGER,
    "monthly_token_limit" INTEGER,
    "monthly_cost_cents_limit" INTEGER,
    "approval_policy" JSONB NOT NULL DEFAULT '{}',
    "prompt_version" INTEGER NOT NULL DEFAULT 0,
    "system_prompt" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "conversation_id" UUID,
    "model" TEXT NOT NULL,
    "role" "AiModelRole" NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "tool_duration_ms" INTEGER,
    "tool_errors" INTEGER NOT NULL DEFAULT 0,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "human_handoff" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_accounts_company_id_idx" ON "channel_accounts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_accounts_channel_phone_number_id_key" ON "channel_accounts"("channel", "phone_number_id");

-- CreateIndex
CREATE INDEX "user_channel_links_user_id_idx" ON "user_channel_links"("user_id");

-- CreateIndex
CREATE INDEX "user_channel_links_company_id_idx" ON "user_channel_links"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_channel_links_channel_phone_number_key" ON "user_channel_links"("channel", "phone_number");

-- CreateIndex
CREATE INDEX "whatsapp_verifications_user_id_idx" ON "whatsapp_verifications"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_verifications_phone_number_idx" ON "whatsapp_verifications"("phone_number");

-- CreateIndex
CREATE INDEX "whatsapp_verifications_expires_at_idx" ON "whatsapp_verifications"("expires_at");

-- CreateIndex
CREATE INDEX "conversations_company_id_last_message_at_idx" ON "conversations"("company_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_user_channel_link_id_status_idx" ON "conversations"("user_channel_link_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "messages_wa_message_id_key" ON "messages"("wa_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_company_id_key" ON "ai_settings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_history_company_id_version_key" ON "ai_prompt_history"("company_id", "version");

-- CreateIndex
CREATE INDEX "ai_usage_logs_company_id_created_at_idx" ON "ai_usage_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_logs_conversation_id_idx" ON "ai_usage_logs"("conversation_id");

-- AddForeignKey
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_channel_links" ADD CONSTRAINT "user_channel_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_channel_links" ADD CONSTRAINT "user_channel_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_channel_link_id_fkey" FOREIGN KEY ("user_channel_link_id") REFERENCES "user_channel_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_prompt_history" ADD CONSTRAINT "ai_prompt_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

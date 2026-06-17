-- Document email outbox (retry queue + history) and audit EMAIL action
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMAIL';

CREATE TYPE "DocumentEmailStatus" AS ENUM (
  'PENDING_PDF',
  'PENDING_SEND',
  'SENT',
  'DELIVERED',
  'FAILED'
);

CREATE TYPE "DocumentEmailTrigger" AS ENUM (
  'AUTO',
  'MANUAL',
  'RESEND'
);

CREATE TABLE "document_email_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "document_number" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "shop_id" UUID,
  "recipient" TEXT NOT NULL,
  "attachment_filename" TEXT,
  "status" "DocumentEmailStatus" NOT NULL DEFAULT 'PENDING_PDF',
  "trigger" "DocumentEmailTrigger" NOT NULL DEFAULT 'MANUAL',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "next_retry_at" TIMESTAMPTZ(6),
  "payload_json" JSONB NOT NULL,
  "sent_at" TIMESTAMPTZ(6),
  "sent_by_id" UUID,
  "message_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_email_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_email_outbox_entity_type_entity_id_created_at_idx"
  ON "document_email_outbox"("entity_type", "entity_id", "created_at" DESC);

CREATE INDEX "document_email_outbox_status_next_retry_at_idx"
  ON "document_email_outbox"("status", "next_retry_at");

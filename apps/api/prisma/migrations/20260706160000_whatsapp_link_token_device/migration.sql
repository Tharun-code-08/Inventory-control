-- WhatsApp secure link tokens + trusted devices (agent platform)

-- New enums
CREATE TYPE "LinkTokenStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
CREATE TYPE "WhatsAppDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ARCHIVED');

-- New audit actions for device linking lifecycle
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LINK_TOKEN_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LINK_TOKEN_USED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEVICE_LINKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEVICE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEVICE_REJECTED';

-- CreateTable: whatsapp_link_tokens
CREATE TABLE "whatsapp_link_tokens" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_version" TEXT NOT NULL DEFAULT 'V1',
    "status" "LinkTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(6),
    "linked_phone" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "generated_ip" TEXT,
    "generated_user_agent" TEXT,

    CONSTRAINT "whatsapp_link_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_link_tokens_token_hash_key" ON "whatsapp_link_tokens"("token_hash");
CREATE INDEX "whatsapp_link_tokens_user_id_status_idx" ON "whatsapp_link_tokens"("user_id", "status");
CREATE INDEX "whatsapp_link_tokens_status_expires_at_idx" ON "whatsapp_link_tokens"("status", "expires_at");
CREATE INDEX "whatsapp_link_tokens_company_id_idx" ON "whatsapp_link_tokens"("company_id");

ALTER TABLE "whatsapp_link_tokens"
  ADD CONSTRAINT "whatsapp_link_tokens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_link_tokens"
  ADD CONSTRAINT "whatsapp_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: whatsapp_devices
CREATE TABLE "whatsapp_devices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_number" TEXT NOT NULL,
    "nickname" TEXT,
    "device_type" TEXT,
    "status" "WhatsAppDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_devices_phone_number_key" ON "whatsapp_devices"("phone_number");
CREATE INDEX "whatsapp_devices_user_id_status_idx" ON "whatsapp_devices"("user_id", "status");
CREATE INDEX "whatsapp_devices_company_id_idx" ON "whatsapp_devices"("company_id");

ALTER TABLE "whatsapp_devices"
  ADD CONSTRAINT "whatsapp_devices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_devices"
  ADD CONSTRAINT "whatsapp_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_devices"
  ADD CONSTRAINT "whatsapp_devices_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

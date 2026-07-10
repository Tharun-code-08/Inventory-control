-- Notification Engine — append-only delivery ledger (Phase 1, Step 2)
-- See docs/event-platform/state-machines.md. Adds only the delivery ledger +
-- its enums; no other schema drift is touched by this migration.

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('IN_APP', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryState" AS ENUM ('CREATED', 'QUEUED', 'DISPATCHING', 'SENT', 'DELIVERED', 'READ', 'ACKNOWLEDGED', 'FAILED');

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "notification_id" UUID,
    "company_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "state" "DeliveryState" NOT NULL DEFAULT 'CREATED',
    "classification" "EventClassification" NOT NULL,
    "provider_message_id" TEXT,
    "latency_ms" INTEGER,
    "sla_seconds" INTEGER,
    "correlation_id" UUID NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_event_id_recipient_user_id_channel_a_key" ON "notification_deliveries"("event_id", "recipient_user_id", "channel", "attempt");

-- CreateIndex
CREATE INDEX "notification_deliveries_event_id_idx" ON "notification_deliveries"("event_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_company_id_channel_state_idx" ON "notification_deliveries"("company_id", "channel", "state");

-- CreateIndex
CREATE INDEX "notification_deliveries_recipient_user_id_created_at_idx" ON "notification_deliveries"("recipient_user_id", "created_at");

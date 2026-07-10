-- Enterprise Event Platform — transactional outbox (Phase 1, Step 1)
-- See docs/event-platform/. Adds only the outbox table + its enums; no other
-- schema drift is touched by this migration.

-- CreateEnum
CREATE TYPE "EventClassification" AS ENUM ('AUTHENTICATION', 'SECURITY', 'FINANCIAL', 'COMPLIANCE', 'OPERATIONAL', 'SYSTEM', 'AI', 'MARKETING');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('CREATED', 'VALIDATED', 'PENDING', 'PUBLISHED', 'ACKNOWLEDGED', 'FAILED', 'DEAD', 'REPLAYED');

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "classification" "EventClassification" NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" UUID NOT NULL,
    "causation_id" UUID,
    "trace_id" TEXT,
    "span_id" TEXT,
    "actor_id" UUID,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_event_id_key" ON "outbox_events"("event_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_company_id_idx" ON "outbox_events"("company_id");

-- CreateIndex
CREATE INDEX "outbox_events_event_type_event_version_idx" ON "outbox_events"("event_type", "event_version");

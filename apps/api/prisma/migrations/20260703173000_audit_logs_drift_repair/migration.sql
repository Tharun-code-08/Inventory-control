-- Staging drift repair: audit_logs lagged behind the AuditLog model, so EVERY
-- audit write failed with P2022 ("device_id does not exist") — silently, since
-- AuditService never throws. Additive only; discovered during Phase 3 smoke.

-- CreateEnum (model references it; missing in this database)
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable: add the columns the model writes
ALTER TABLE "audit_logs" ADD COLUMN "device_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "metadata" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "reason" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "severity" "AuditSeverity";
ALTER TABLE "audit_logs" ADD COLUMN "request_id" TEXT;

-- AlterTable: model declares entity_id as TEXT (no @db.Uuid); align the type
-- so non-UUID entity ids (e.g. emails on auth events) can be recorded.
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" TYPE TEXT USING "entity_id"::text;

-- Indexes from the model that depend on the new columns
CREATE INDEX "audit_logs_reason_created_at_idx" ON "audit_logs"("reason", "created_at");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

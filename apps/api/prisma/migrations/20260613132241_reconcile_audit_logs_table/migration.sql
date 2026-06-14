-- Reconcile the audit log table with the Prisma schema.
--
-- The initial migration created a singular "audit_log" table with a reduced
-- column set and a small AuditAction enum. The schema (and the index migration
-- that follows) instead expects a plural "audit_logs" table with several extra
-- columns plus the AuditReason / AuditSeverity enums and the full AuditAction
-- value set. No migration ever bridged that gap, so `migrate deploy` failed on
-- the following index migration with `relation "audit_logs" does not exist`.
-- This migration performs that reconciliation.

-- 1. Enums expected by the schema but never created by a migration.
CREATE TYPE "AuditReason" AS ENUM ('USER_NOT_FOUND', 'INVALID_PASSWORD', 'ACCOUNT_LOCKED', 'DEVICE_BLOCKED', 'ACCESS_DENIED', 'MFA_FAILED', 'SESSION_EXPIRED');
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 2. Backfill the AuditAction enum with the values defined in the schema.
--    (STOCK_ADJUSTMENT and the VIEW_DASHBOARD/DASHBOARD_* values are added by
--    their own dedicated migrations, so they are intentionally omitted here.)
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_PRODUCT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_PRODUCT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE_PRODUCT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_GR';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_GR';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RECEIVE_GOODS';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TRANSFER_STOCK';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_ISSUE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_PO';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_PO';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONFIRM_PO';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CANCEL_PO';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVE_PO';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REJECT_PO';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REJECT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ESCALATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_USER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_USER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE_USER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_ROLE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVOKE_SESSION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPORT_REPORT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPORT_AUDIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE_DATA';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BULK_UPDATE';

-- 3. Drop the old single-table indexes (replaced below with schema-named ones).
DROP INDEX IF EXISTS "audit_log_user_id_created_at_idx";
DROP INDEX IF EXISTS "audit_log_entity_type_entity_id_idx";
DROP INDEX IF EXISTS "audit_log_created_at_idx";

-- 4. Rename the table and its constraints to match the schema.
ALTER TABLE "audit_log" RENAME TO "audit_logs";
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_log_pkey" TO "audit_logs_pkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_log_user_id_fkey";

-- 5. Align existing columns with the schema.
ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" SET DATA TYPE TEXT USING "entity_id"::TEXT;

-- 6. Add the columns introduced after the initial migration.
ALTER TABLE "audit_logs" ADD COLUMN "company_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN "device_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "metadata" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "reason" "AuditReason";
ALTER TABLE "audit_logs" ADD COLUMN "severity" "AuditSeverity";
ALTER TABLE "audit_logs" ADD COLUMN "request_id" TEXT;

-- company_id is required in the schema. The table is empty at this point on a
-- fresh deploy, so promoting it to NOT NULL is safe.
ALTER TABLE "audit_logs" ALTER COLUMN "company_id" SET NOT NULL;

-- 7. Foreign keys named as the schema expects.
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Indexes defined on the model. The entity_type/entity_id/created_at index is
--    created by the migration that immediately follows this one.
CREATE INDEX "audit_logs_company_id_action_created_at_idx" ON "audit_logs"("company_id", "action", "created_at");
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX "audit_logs_reason_created_at_idx" ON "audit_logs"("reason", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

-- AlterTable: Make companyId nullable
ALTER TABLE "audit_logs" ALTER COLUMN "company_id" DROP NOT NULL;

-- AlterTable: Make userId nullable
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable: Change reason from enum to text
ALTER TABLE "audit_logs" ALTER COLUMN "reason" TYPE TEXT;

-- DropEnum: Remove AuditReason enum
DROP TYPE IF EXISTS "AuditReason";

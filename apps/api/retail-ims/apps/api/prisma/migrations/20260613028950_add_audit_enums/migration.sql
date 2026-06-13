-- Create AuditReason enum type
CREATE TYPE "AuditReason" AS ENUM ('USER_NOT_FOUND', 'INVALID_PASSWORD', 'ACCOUNT_LOCKED', 'DEVICE_BLOCKED', 'ACCESS_DENIED', 'MFA_FAILED', 'SESSION_EXPIRED');

-- Create AuditSeverity enum type
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Alter audit_logs table to use new enums
-- First, handle the reason column
ALTER TABLE "audit_logs" ALTER COLUMN "reason" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "reason" TYPE "AuditReason" USING CASE
  WHEN "reason" = 'USER_NOT_FOUND' THEN 'USER_NOT_FOUND'::"AuditReason"
  WHEN "reason" = 'INVALID_PASSWORD' THEN 'INVALID_PASSWORD'::"AuditReason"
  WHEN "reason" = 'ACCOUNT_LOCKED' THEN 'ACCOUNT_LOCKED'::"AuditReason"
  WHEN "reason" = 'DEVICE_BLOCKED' THEN 'DEVICE_BLOCKED'::"AuditReason"
  WHEN "reason" = 'ACCESS_DENIED' THEN 'ACCESS_DENIED'::"AuditReason"
  WHEN "reason" = 'MFA_FAILED' THEN 'MFA_FAILED'::"AuditReason"
  WHEN "reason" = 'SESSION_EXPIRED' THEN 'SESSION_EXPIRED'::"AuditReason"
  ELSE NULL
END;

-- Handle the severity column
ALTER TABLE "audit_logs" ALTER COLUMN "severity" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "severity" TYPE "AuditSeverity" USING CASE
  WHEN "severity" = 'LOW' THEN 'LOW'::"AuditSeverity"
  WHEN "severity" = 'MEDIUM' THEN 'MEDIUM'::"AuditSeverity"
  WHEN "severity" = 'HIGH' THEN 'HIGH'::"AuditSeverity"
  WHEN "severity" = 'CRITICAL' THEN 'CRITICAL'::"AuditSeverity"
  ELSE NULL
END;

-- Drop existing foreign key constraints
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_company_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- Re-add foreign key constraints as optional
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create new indexes
CREATE INDEX "audit_logs_reason_created_at_idx" ON "audit_logs"("reason", "created_at");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

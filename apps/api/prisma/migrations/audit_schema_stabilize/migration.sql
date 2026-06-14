-- Make companyId nullable (LOGIN_FAILED can occur before company is known)
ALTER TABLE "audit_logs" ALTER COLUMN "company_id" DROP NOT NULL;

-- Make userId nullable (USER_NOT_FOUND has no user to log)
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;

-- Convert reason from AuditReason enum to String for flexibility
ALTER TABLE "audit_logs" 
  ALTER COLUMN "reason" TYPE TEXT USING "reason"::text;

-- Drop the AuditReason enum if it's no longer used
-- (Only drop if no other columns use it)
DROP TYPE IF EXISTS "AuditReason";

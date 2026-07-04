-- Staging drift repair (part 3, user-approved): audit_logs had NOT NULL on
-- columns the AuditLog model declares optional, so auth events without an
-- entity (LOGIN_FAILED, LOGIN) violated constraints and were silently dropped
-- by AuditService. Aligns nullability with the model exactly.

ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "company_id" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;

-- Staging drift repair (part 3, user-approved): audit_logs had NOT NULL on
-- columns the AuditLog model declares optional, so auth events without an
-- entity (LOGIN_FAILED, LOGIN) violated constraints and were silently dropped
-- by AuditService. Aligns nullability with the model exactly.
-- Guarded: columns may not exist on fresh DB (added in drift-repair migration).

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE "audit_logs" ALTER COLUMN "company_id" DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;
  END IF;
END $$;

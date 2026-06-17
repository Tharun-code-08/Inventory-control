-- prisma:no-transaction
-- Extend RoleName enum with system roles (idempotent per value).
DO $$ BEGIN ALTER TYPE "RoleName" ADD VALUE 'OWNER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "RoleName" ADD VALUE 'WAREHOUSE_STAFF'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "RoleName" ADD VALUE 'VIEWER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "RoleName" ADD VALUE 'VENDOR'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

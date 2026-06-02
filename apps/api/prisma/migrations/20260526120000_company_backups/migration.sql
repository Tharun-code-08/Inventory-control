-- Company backup / restore tables

CREATE TABLE IF NOT EXISTS "companies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_code" TEXT NOT NULL,
  "company_name" TEXT NOT NULL,
  "address" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "companies_company_code_key" ON "companies"("company_code");

DO $$ BEGIN
  CREATE TYPE "BackupProvider" AS ENUM ('MANUAL', 'GOOGLE_DRIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BackupJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RestoreJobStatus" AS ENUM ('PENDING', 'DRY_RUN_COMPLETED', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RestoreMode" AS ENUM ('TENANT_REPLACE', 'FULL_DB');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "backup_provider_credentials" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "provider" "BackupProvider" NOT NULL DEFAULT 'GOOGLE_DRIVE',
    "encrypted_tokens" TEXT NOT NULL,
    "account_email" TEXT,
    "drive_folder_id" TEXT,
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "backup_provider_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "backup_jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "status" "BackupJobStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "BackupProvider" NOT NULL,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "backup_artifacts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "backup_job_id" UUID,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "provider" "BackupProvider" NOT NULL,
    "drive_file_id" TEXT,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "restore_jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "artifact_id" UUID NOT NULL,
    "mode" "RestoreMode" NOT NULL DEFAULT 'TENANT_REPLACE',
    "status" "RestoreJobStatus" NOT NULL DEFAULT 'PENDING',
    "dry_run_report" JSONB,
    "confirmation_token" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restore_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "backup_provider_credentials_company_id_provider_key" ON "backup_provider_credentials"("company_id", "provider");

CREATE UNIQUE INDEX IF NOT EXISTS "backup_artifacts_backup_job_id_key" ON "backup_artifacts"("backup_job_id");

CREATE INDEX IF NOT EXISTS "backup_artifacts_company_id_created_at_idx" ON "backup_artifacts"("company_id", "created_at");

CREATE INDEX IF NOT EXISTS "backup_jobs_company_id_created_at_idx" ON "backup_jobs"("company_id", "created_at");

CREATE INDEX IF NOT EXISTS "restore_jobs_company_id_created_at_idx" ON "restore_jobs"("company_id", "created_at");

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.backup_provider_credentials') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'backup_provider_credentials_company_id_fkey'
     ) THEN
    ALTER TABLE "backup_provider_credentials"
      ADD CONSTRAINT "backup_provider_credentials_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.backup_jobs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'backup_jobs_company_id_fkey'
     ) THEN
    ALTER TABLE "backup_jobs"
      ADD CONSTRAINT "backup_jobs_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.backup_artifacts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'backup_artifacts_company_id_fkey'
     ) THEN
    ALTER TABLE "backup_artifacts"
      ADD CONSTRAINT "backup_artifacts_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.backup_jobs') IS NOT NULL
     AND to_regclass('public.backup_artifacts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'backup_artifacts_backup_job_id_fkey'
     ) THEN
    ALTER TABLE "backup_artifacts"
      ADD CONSTRAINT "backup_artifacts_backup_job_id_fkey"
      FOREIGN KEY ("backup_job_id") REFERENCES "backup_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.restore_jobs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'restore_jobs_company_id_fkey'
     ) THEN
    ALTER TABLE "restore_jobs"
      ADD CONSTRAINT "restore_jobs_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.backup_artifacts') IS NOT NULL
     AND to_regclass('public.restore_jobs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'restore_jobs_artifact_id_fkey'
     ) THEN
    ALTER TABLE "restore_jobs"
      ADD CONSTRAINT "restore_jobs_artifact_id_fkey"
      FOREIGN KEY ("artifact_id") REFERENCES "backup_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

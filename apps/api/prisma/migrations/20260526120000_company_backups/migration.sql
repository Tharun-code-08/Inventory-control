-- CreateEnum
CREATE TYPE "BackupProvider" AS ENUM ('MANUAL', 'GOOGLE_DRIVE');

-- CreateEnum
CREATE TYPE "BackupJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RestoreJobStatus" AS ENUM ('PENDING', 'DRY_RUN_COMPLETED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RestoreMode" AS ENUM ('TENANT_REPLACE', 'FULL_DB');

-- CreateTable
CREATE TABLE "backup_provider_credentials" (
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

-- CreateTable
CREATE TABLE "backup_jobs" (
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

-- CreateTable
CREATE TABLE "backup_artifacts" (
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

-- CreateTable
CREATE TABLE "restore_jobs" (
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

-- CreateIndex
CREATE UNIQUE INDEX "backup_provider_credentials_company_id_provider_key" ON "backup_provider_credentials"("company_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "backup_artifacts_backup_job_id_key" ON "backup_artifacts"("backup_job_id");

-- CreateIndex
CREATE INDEX "backup_artifacts_company_id_created_at_idx" ON "backup_artifacts"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "backup_jobs_company_id_created_at_idx" ON "backup_jobs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "restore_jobs_company_id_created_at_idx" ON "restore_jobs"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "backup_provider_credentials" ADD CONSTRAINT "backup_provider_credentials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_artifacts" ADD CONSTRAINT "backup_artifacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_artifacts" ADD CONSTRAINT "backup_artifacts_backup_job_id_fkey" FOREIGN KEY ("backup_job_id") REFERENCES "backup_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "backup_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename audit_log → audit_logs to match the @@map("audit_logs") added to the Prisma schema.
-- The rename happened in production via prisma db push without a migration file.
-- This migration closes that gap: idempotent on production, applies the rename on staging
-- and any future fresh installs.

DO $$
BEGIN
  -- Only rename if the old table exists and the new one does not.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE "audit_log" RENAME TO "audit_logs";
    ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_log_pkey" TO "audit_logs_pkey";
    ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_log_user_id_fkey" TO "audit_logs_user_id_fkey";
    ALTER INDEX "audit_log_user_id_created_at_idx"  RENAME TO "audit_logs_user_id_created_at_idx";
    ALTER INDEX "audit_log_entity_type_entity_id_idx" RENAME TO "audit_logs_entity_type_entity_id_idx";
    ALTER INDEX "audit_log_created_at_idx"           RENAME TO "audit_logs_created_at_idx";
  END IF;
END $$;

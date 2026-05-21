-- Tier 2 Phase 1 + Phase 3 schema additions:
--   * Soft-delete (`deleted_at`) on users and suppliers (Phase 1).
--   * Account lockout columns on users (Phase 3).
--   * Sessions table to replace single `users.refresh_token_hash` (Phase 3).
--   * Job failures DLQ table for BullMQ workers (Phase 1).

ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMPTZ(6);
CREATE INDEX "users_deleted_at_idx" ON "users" ("deleted_at");

ALTER TABLE "suppliers" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
CREATE INDEX "suppliers_deleted_at_idx" ON "suppliers" ("deleted_at");

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions" ("user_id", "revoked_at");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");

CREATE TABLE "job_failures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "queue" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "job_id" TEXT,
    "data" JSONB,
    "error_name" TEXT,
    "error_message" TEXT,
    "stack" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "failed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_failures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "job_failures_queue_failed_at_idx" ON "job_failures" ("queue", "failed_at");
CREATE INDEX "job_failures_job_id_idx" ON "job_failures" ("job_id");

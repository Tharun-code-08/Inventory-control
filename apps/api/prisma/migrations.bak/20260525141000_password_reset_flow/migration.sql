DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PasswordResetMethod' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "PasswordResetMethod" AS ENUM ('OTP', 'MAGIC_LINK');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "password_reset_requests" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "method" "PasswordResetMethod" NOT NULL,
  "otp_hash" TEXT,
  "link_token_hash" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_sent_at" TIMESTAMPTZ(6),
  "requested_ip" TEXT,
  "requested_user_agent" TEXT,
  CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_reset_requests_user_id_idx"
  ON "password_reset_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_requests_email_idx"
  ON "password_reset_requests" ("email");
CREATE INDEX IF NOT EXISTS "password_reset_requests_link_token_hash_idx"
  ON "password_reset_requests" ("link_token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_requests_expires_at_idx"
  ON "password_reset_requests" ("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_requests_user_id_fkey'
  ) THEN
    ALTER TABLE "password_reset_requests"
      ADD CONSTRAINT "password_reset_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'MfaMethod' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "MfaMethod" AS ENUM ('TOTP');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'AuthChallengePurpose' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "AuthChallengePurpose" AS ENUM ('SIGNUP_MFA_ENROLL', 'LOGIN_MFA_VERIFY');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mfa_method" "MfaMethod",
  ADD COLUMN IF NOT EXISTS "mfa_enrolled_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "mfa_secret_encrypted" TEXT;

CREATE TABLE IF NOT EXISTS "auth_challenges" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "purpose" "AuthChallengePurpose" NOT NULL,
  "token_hash" TEXT NOT NULL,
  "totp_secret_encrypted" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requested_ip" TEXT,
  "requested_user_agent" TEXT,
  CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_backup_codes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code_hash" TEXT NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_backup_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trusted_mfa_devices" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "last_used_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trusted_mfa_devices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_challenges_user_id_idx"
  ON "auth_challenges" ("user_id");
CREATE INDEX IF NOT EXISTS "auth_challenges_token_hash_idx"
  ON "auth_challenges" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_challenges_expires_at_idx"
  ON "auth_challenges" ("expires_at");
CREATE INDEX IF NOT EXISTS "user_backup_codes_user_id_consumed_at_idx"
  ON "user_backup_codes" ("user_id", "consumed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "trusted_mfa_devices_token_hash_key"
  ON "trusted_mfa_devices" ("token_hash");
CREATE INDEX IF NOT EXISTS "trusted_mfa_devices_user_id_expires_at_revoked_at_idx"
  ON "trusted_mfa_devices" ("user_id", "expires_at", "revoked_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_challenges_user_id_fkey'
  ) THEN
    ALTER TABLE "auth_challenges"
      ADD CONSTRAINT "auth_challenges_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_backup_codes_user_id_fkey'
  ) THEN
    ALTER TABLE "user_backup_codes"
      ADD CONSTRAINT "user_backup_codes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trusted_mfa_devices_user_id_fkey'
  ) THEN
    ALTER TABLE "trusted_mfa_devices"
      ADD CONSTRAINT "trusted_mfa_devices_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

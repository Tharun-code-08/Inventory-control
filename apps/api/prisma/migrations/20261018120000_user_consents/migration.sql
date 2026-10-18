-- Signup consent records (Terms of Service + Privacy Policy acceptance).
-- Written to be safe if the table was already created by hand on a server
-- where this feature was hot-patched before it reached the repository.

CREATE TABLE IF NOT EXISTS "user_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "terms_version" VARCHAR(20) NOT NULL,
    "privacy_policy_version" VARCHAR(20) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_consents_user_id_idx" ON "user_consents"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_consents_user_id_fkey') THEN
    ALTER TABLE "user_consents"
      ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

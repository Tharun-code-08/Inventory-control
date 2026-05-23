-- CreateTable
CREATE TABLE IF NOT EXISTS "user_invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role_id" UUID NOT NULL,
    "shop_id" UUID,
    "token_hash" TEXT NOT NULL,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_invitations_email_idx" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_invitations_token_hash_idx" ON "user_invitations"("token_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");

-- AddForeignKey role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_role_id_fkey'
  ) THEN
    ALTER TABLE "user_invitations"
      ADD CONSTRAINT "user_invitations_role_id_fkey"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey shop (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_shop_id_fkey'
  ) THEN
    ALTER TABLE "user_invitations"
      ADD CONSTRAINT "user_invitations_shop_id_fkey"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey invited_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_invited_by_fkey'
  ) THEN
    ALTER TABLE "user_invitations"
      ADD CONSTRAINT "user_invitations_invited_by_fkey"
      FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
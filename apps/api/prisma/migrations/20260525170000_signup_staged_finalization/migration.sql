ALTER TABLE "signup_verifications"
ADD COLUMN "session_token_hash" TEXT,
ADD COLUMN "totp_secret_encrypted" TEXT;

CREATE INDEX "signup_verifications_session_token_hash_idx"
ON "signup_verifications"("session_token_hash");

-- CreateTable
CREATE TABLE "signup_verifications" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signup_verifications_email_idx" ON "signup_verifications"("email");

-- CreateIndex
CREATE INDEX "signup_verifications_expires_at_idx" ON "signup_verifications"("expires_at");

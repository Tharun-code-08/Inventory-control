-- CreateEnum
CREATE TYPE "EmailSenderType" AS ENUM ('CUSTOM_DOMAIN', 'PUBLIC_DOMAIN');

-- CreateEnum
CREATE TYPE "EmailSenderStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "email_sender_domains" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "dkim_selector" TEXT NOT NULL,
    "dkim_host" TEXT NOT NULL,
    "dkim_value" TEXT NOT NULL,
    "status" "EmailSenderStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ(6),
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_sender_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sender_identities" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "domain_id" UUID,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sender_type" "EmailSenderType" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "EmailSenderStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_sender_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sender_verifications" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sender_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_sender_domains_company_id_domain_key" ON "email_sender_domains"("company_id", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "email_sender_identities_company_id_email_key" ON "email_sender_identities"("company_id", "email");

-- CreateIndex
CREATE INDEX "email_sender_identities_company_id_is_primary_idx" ON "email_sender_identities"("company_id", "is_primary");

-- CreateIndex
CREATE INDEX "email_sender_verifications_sender_id_expires_at_idx" ON "email_sender_verifications"("sender_id", "expires_at");

-- AddForeignKey
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.email_sender_domains') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'email_sender_domains_company_id_fkey'
     ) THEN
    ALTER TABLE "email_sender_domains"
      ADD CONSTRAINT "email_sender_domains_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.email_sender_identities') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'email_sender_identities_company_id_fkey'
     ) THEN
    ALTER TABLE "email_sender_identities"
      ADD CONSTRAINT "email_sender_identities_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "email_sender_identities" ADD CONSTRAINT "email_sender_identities_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email_sender_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_sender_verifications" ADD CONSTRAINT "email_sender_verifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "email_sender_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

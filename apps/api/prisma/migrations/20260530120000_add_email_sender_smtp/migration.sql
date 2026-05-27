-- AlterTable
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_host" TEXT;
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_port" INTEGER;
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_secure" BOOLEAN;
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_user" TEXT;
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_password_enc" TEXT;
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_configured_at" TIMESTAMPTZ(6);
ALTER TABLE "email_sender_identities" ADD COLUMN "smtp_last_verified_at" TIMESTAMPTZ(6);

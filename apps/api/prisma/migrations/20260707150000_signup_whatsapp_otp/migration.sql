-- Dual-channel signup verification: WhatsApp OTP alongside the email OTP.
ALTER TABLE "signup_verifications" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "signup_verifications" ADD COLUMN IF NOT EXISTS "phone_otp_hash" TEXT;

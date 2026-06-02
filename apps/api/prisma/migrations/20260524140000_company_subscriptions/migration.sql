-- Company subscription / trial fields for SaaS billing
DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'PRO', 'PLUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
      ADD COLUMN IF NOT EXISTS "billing_cycle" "BillingCycle",
      ADD COLUMN IF NOT EXISTS "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "trial_starts_at" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "subscription_ends_at" TIMESTAMPTZ;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "plan" "SubscriptionPlan" NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "razorpay_order_id" TEXT NOT NULL,
  "razorpay_payment_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "verified_at" TIMESTAMPTZ,
  "consumed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payments_razorpay_order_id_key"
  ON "subscription_payments"("razorpay_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payments_razorpay_payment_id_key"
  ON "subscription_payments"("razorpay_payment_id");
CREATE INDEX IF NOT EXISTS "subscription_payments_company_id_idx"
  ON "subscription_payments"("company_id");

DO $$ BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    BEGIN
      ALTER TABLE "subscription_payments"
        ADD CONSTRAINT "subscription_payments_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Existing companies: start 7-day trial from now if no trial window set
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    UPDATE "companies"
    SET
      "trial_starts_at" = COALESCE("trial_starts_at", now()),
      "trial_ends_at" = COALESCE("trial_ends_at", now() + interval '7 days'),
      "subscription_plan" = COALESCE("subscription_plan", 'TRIAL'::"SubscriptionPlan")
    WHERE "trial_ends_at" IS NULL;
  END IF;
END $$;

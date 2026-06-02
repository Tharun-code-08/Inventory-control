-- Subscription lifecycle: invoices, engagement snapshots, campaign enrollments

CREATE TYPE "LifecycleStage" AS ENUM (
  'NEW',
  'ACTIVE',
  'ENGAGED',
  'AT_RISK',
  'RENEWAL_DUE',
  'EXPIRED',
  'TRIAL',
  'TRIAL_EXPIRED'
);

CREATE TYPE "LifecycleCampaignStatus" AS ENUM (
  'SCHEDULED',
  'SENT',
  'SKIPPED',
  'FAILED'
);

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "platform_marketing_opt_out" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "razorpay_subscription_id" TEXT,
      ADD COLUMN IF NOT EXISTS "paid_activated_at" TIMESTAMPTZ(6);
  END IF;
END $$;

ALTER TABLE "subscription_payments"
  ADD COLUMN IF NOT EXISTS "invoice_id" UUID,
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "renewal_attempt" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "email_delivery_log"
  ADD COLUMN IF NOT EXISTS "click_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "open_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "subscription_invoices" (
  "id" UUID NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "tax_paise" INTEGER NOT NULL DEFAULT 0,
  "total_paise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "gst_number" TEXT,
  "billing_address_snapshot" JSONB,
  "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pdf_storage_key" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_invoices_invoice_number_key" ON "subscription_invoices"("invoice_number");
CREATE INDEX "subscription_invoices_company_id_idx" ON "subscription_invoices"("company_id");
CREATE INDEX "subscription_invoices_issued_at_idx" ON "subscription_invoices"("issued_at");

CREATE TABLE "company_engagement_snapshots" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "snapshot_date" DATE NOT NULL,
  "lifecycle_stage" "LifecycleStage" NOT NULL,
  "last_login_at" TIMESTAMPTZ(6),
  "login_count_30d" INTEGER NOT NULL DEFAULT 0,
  "features_used" JSONB NOT NULL DEFAULT '{}',
  "products_count" INTEGER NOT NULL DEFAULT 0,
  "inventory_txn_count" INTEGER NOT NULL DEFAULT 0,
  "team_members_count" INTEGER NOT NULL DEFAULT 0,
  "reports_generated" INTEGER NOT NULL DEFAULT 0,
  "trial_progress_pct" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_engagement_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_engagement_snapshots_company_id_snapshot_date_key"
  ON "company_engagement_snapshots"("company_id", "snapshot_date");
CREATE INDEX "company_engagement_snapshots_snapshot_date_idx" ON "company_engagement_snapshots"("snapshot_date");
CREATE INDEX "company_engagement_snapshots_lifecycle_stage_idx" ON "company_engagement_snapshots"("lifecycle_stage");

CREATE TABLE "lifecycle_campaign_enrollments" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "campaign_key" TEXT NOT NULL,
  "scheduled_for" TIMESTAMPTZ(6),
  "sent_at" TIMESTAMPTZ(6),
  "status" "LifecycleCampaignStatus" NOT NULL DEFAULT 'SCHEDULED',
  "email_delivery_log_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lifecycle_campaign_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lifecycle_campaign_enrollments_company_id_campaign_key_key"
  ON "lifecycle_campaign_enrollments"("company_id", "campaign_key");
CREATE INDEX "lifecycle_campaign_enrollments_campaign_key_idx" ON "lifecycle_campaign_enrollments"("campaign_key");
CREATE INDEX "lifecycle_campaign_enrollments_status_idx" ON "lifecycle_campaign_enrollments"("status");
CREATE INDEX "lifecycle_campaign_enrollments_scheduled_for_idx" ON "lifecycle_campaign_enrollments"("scheduled_for");

ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "subscription_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.subscription_invoices') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'subscription_invoices_company_id_fkey'
     ) THEN
    ALTER TABLE "subscription_invoices"
      ADD CONSTRAINT "subscription_invoices_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.company_engagement_snapshots') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'company_engagement_snapshots_company_id_fkey'
     ) THEN
    ALTER TABLE "company_engagement_snapshots"
      ADD CONSTRAINT "company_engagement_snapshots_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.lifecycle_campaign_enrollments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'lifecycle_campaign_enrollments_company_id_fkey'
     ) THEN
    ALTER TABLE "lifecycle_campaign_enrollments"
      ADD CONSTRAINT "lifecycle_campaign_enrollments_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_payments_invoice_id_idx" ON "subscription_payments"("invoice_id");

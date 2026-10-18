-- Schema↔migrations reconciliation — Category B (ADDITIVE ONLY).
--
-- schema.prisma declares these but no migration creates them, so a database
-- built purely from the repo's migrations (a fresh environment) is missing what
-- the Prisma client expects. See docs/workflow-engine/SCHEMA-RECONCILIATION-ANALYSIS.md.
--
-- Scope: ONLY the safe, additive items —
--   * 3 tables: user_devices, notification_subscriptions, low_stock_alerts
--   * 7 EwaySubType enum values
-- DELIBERATELY EXCLUDED (destructive / need data migrations — separate PR):
--   * column type-mismatch fixes (inventory_exceptions / eway_bills enum columns)
--   * orphan drops (platform_audit_log, supplier_bank_accounts, supplier_contacts,
--     branding_version columns) — Category C/D.
--
-- Idempotent: each table is created only if absent, and enum values use
-- IF NOT EXISTS, so this is safe on ANY environment (fresh, staging, prod)
-- regardless of prior ad-hoc state. DDL is Prisma-generated (matches schema.prisma).

-- ── user_devices ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.user_devices') IS NULL THEN
    CREATE TABLE "user_devices" (
      "id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "company_id" UUID NOT NULL,
      "device_id" TEXT NOT NULL,
      "device_name" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "os_version" TEXT,
      "last_login_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "revoked_at" TIMESTAMPTZ(6),
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL,
      CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "user_devices_device_id_key" ON "user_devices"("device_id");
    CREATE INDEX "user_devices_user_id_revoked_at_idx" ON "user_devices"("user_id", "revoked_at");
    CREATE INDEX "user_devices_company_id_created_at_idx" ON "user_devices"("company_id", "created_at");
    CREATE UNIQUE INDEX "user_devices_user_id_device_id_key" ON "user_devices"("user_id", "device_id");
    ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── notification_subscriptions ──────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.notification_subscriptions') IS NULL THEN
    CREATE TABLE "notification_subscriptions" (
      "id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "company_id" UUID NOT NULL,
      "push_token" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL,
      CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "notification_subscriptions_company_id_platform_is_active_idx" ON "notification_subscriptions"("company_id", "platform", "is_active");
    CREATE INDEX "notification_subscriptions_user_id_idx" ON "notification_subscriptions"("user_id");
    CREATE UNIQUE INDEX "notification_subscriptions_user_id_push_token_key" ON "notification_subscriptions"("user_id", "push_token");
    ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── low_stock_alerts ────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.low_stock_alerts') IS NULL THEN
    CREATE TABLE "low_stock_alerts" (
      "id" UUID NOT NULL,
      "company_id" UUID NOT NULL,
      "product_id" UUID NOT NULL,
      "shop_id" UUID NOT NULL,
      "current_stock" INTEGER NOT NULL,
      "min_stock" INTEGER NOT NULL,
      "reorder_point" INTEGER NOT NULL,
      "alertLevel" TEXT NOT NULL,
      "notified" BOOLEAN NOT NULL DEFAULT false,
      "notified_at" TIMESTAMPTZ(6),
      "resolved" BOOLEAN NOT NULL DEFAULT false,
      "resolved_at" TIMESTAMPTZ(6),
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "low_stock_alerts_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "low_stock_alerts_company_id_alertLevel_notified_idx" ON "low_stock_alerts"("company_id", "alertLevel", "notified");
    CREATE INDEX "low_stock_alerts_shop_id_resolved_at_idx" ON "low_stock_alerts"("shop_id", "resolved_at");
    CREATE INDEX "low_stock_alerts_product_id_created_at_idx" ON "low_stock_alerts"("product_id", "created_at");
    ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── EwaySubType: additive enum values (schema.prisma declares, migrations lack) ──
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'JOB_WORK';
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'SKD_CKD';
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'RECIPIENT_NOT_KNOWN';
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'LINE_SALES';
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'SALES_RETURN';
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'EXHIBITION';
ALTER TYPE "EwaySubType" ADD VALUE IF NOT EXISTS 'OTHERS';

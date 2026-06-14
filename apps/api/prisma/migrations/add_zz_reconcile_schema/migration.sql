-- Reconcile the database with the Prisma schema.
--
-- Several models (UserDevice, NotificationSubscription, LowStockAlert) existed
-- in schema.prisma without a corresponding migration, and a couple of legacy
-- tables (OwnerFeedback, platform_audit_log) were created by earlier migrations
-- but are not part of the schema. This migration brings the applied migration
-- state in line with the schema so `prisma migrate deploy` produces a database
-- that exactly matches schema.prisma.

-- DropTable (legacy tables not present in the schema). These are dropped first
-- because platform_audit_log.action depends on the AuditAction enum, which is
-- recreated below.
DROP TABLE IF EXISTS "OwnerFeedback";
DROP TABLE IF EXISTS "platform_audit_log";

-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'MFA_ENABLED', 'MFA_DISABLED', 'PASSWORD_CHANGED', 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'CREATE_GR', 'UPDATE_GR', 'RECEIVE_GOODS', 'TRANSFER_STOCK', 'STOCK_ADJUSTMENT', 'CREATE_ISSUE', 'CREATE_PO', 'UPDATE_PO', 'CONFIRM_PO', 'CANCEL_PO', 'APPROVE_PO', 'REJECT_PO', 'APPROVE', 'REJECT', 'ESCALATE', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UPDATE_ROLE', 'REVOKE_SESSION', 'EXPORT_REPORT', 'EXPORT_AUDIT', 'VIEW_DASHBOARD', 'DASHBOARD_CARD_CLICKED', 'DASHBOARD_ACTION_TAKEN', 'DELETE_DATA', 'BULK_UPDATE', 'CREATE', 'UPDATE', 'DELETE', 'POST');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- DropIndex
DROP INDEX "audit_logs_entity_type_entity_id_created_at_idx";

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_device_id_key" ON "user_devices"("device_id");

-- CreateIndex
CREATE INDEX "user_devices_user_id_revoked_at_idx" ON "user_devices"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "user_devices_company_id_created_at_idx" ON "user_devices"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_id_key" ON "user_devices"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "notification_subscriptions_company_id_platform_is_active_idx" ON "notification_subscriptions"("company_id", "platform", "is_active");

-- CreateIndex
CREATE INDEX "notification_subscriptions_user_id_idx" ON "notification_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_subscriptions_user_id_push_token_key" ON "notification_subscriptions"("user_id", "push_token");

-- CreateIndex
CREATE INDEX "low_stock_alerts_company_id_alertLevel_notified_idx" ON "low_stock_alerts"("company_id", "alertLevel", "notified");

-- CreateIndex
CREATE INDEX "low_stock_alerts_shop_id_resolved_at_idx" ON "low_stock_alerts"("shop_id", "resolved_at");

-- CreateIndex
CREATE INDEX "low_stock_alerts_product_id_created_at_idx" ON "low_stock_alerts"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;


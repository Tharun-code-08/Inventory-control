-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'PURCHASE_ORDER', 'QUOTATION', 'GOODS_ISSUE', 'GOODS_RECEIPT', 'EWAY_BILL', 'DELIVERY_CHALLAN', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PRODUCTION_ORDER', 'SERVICE_ORDER', 'RFQ', 'DELIVERY_NOTE', 'STOCK_TRANSFER', 'PURCHASE_RETURN', 'SALES_RETURN', 'MATERIAL_REQUEST', 'WORK_ORDER', 'REPORT');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('EXPIRY', 'LOW_STOCK', 'TRANSFER', 'BLOCKED_LOT', 'INVENTORY_INTEGRITY');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('LOT', 'PRODUCT', 'TRANSFER', 'STORAGE_LOCATION');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'MFA_ENABLED', 'MFA_DISABLED', 'PASSWORD_CHANGED', 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'CREATE_GR', 'UPDATE_GR', 'RECEIVE_GOODS', 'TRANSFER_STOCK', 'STOCK_ADJUSTMENT', 'CREATE_ISSUE', 'CREATE_PO', 'UPDATE_PO', 'CONFIRM_PO', 'CANCEL_PO', 'APPROVE_PO', 'REJECT_PO', 'APPROVE', 'REJECT', 'ESCALATE', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UPDATE_ROLE', 'REVOKE_SESSION', 'EXPORT_REPORT', 'EXPORT_AUDIT', 'VIEW_DASHBOARD', 'DASHBOARD_CARD_CLICKED', 'DASHBOARD_ACTION_TAKEN', 'DASHBOARD_EXIT', 'ATTENTION_ITEM_RESOLVED', 'DELETE_DATA', 'BULK_UPDATE', 'CREATE', 'UPDATE', 'DELETE', 'POST', 'LINK_TOKEN_GENERATED', 'LINK_TOKEN_USED', 'DEVICE_LINKED', 'DEVICE_REVOKED', 'DEVICE_REJECTED');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "document_registry" DROP CONSTRAINT "fk_tenant";

-- DropForeignKey
ALTER TABLE "eway_bill_items" DROP CONSTRAINT "eway_bill_items_eway_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "eway_bills" DROP CONSTRAINT "eway_bills_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "goods_issue_header" DROP CONSTRAINT "fk_goods_issue_header_reversed_by";

-- DropForeignKey
ALTER TABLE "goods_receipt_header" DROP CONSTRAINT "fk_goods_receipt_header_reversed_by";

-- DropForeignKey
ALTER TABLE "pdf_jobs" DROP CONSTRAINT "fk_tenant";

-- DropForeignKey
ALTER TABLE "platform_audit_log" DROP CONSTRAINT "platform_audit_log_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_user_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_created_at_idx";

-- DropIndex
DROP INDEX "audit_logs_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "company_health_score_configs_company_idx";

-- DropIndex
DROP INDEX "customers_customer_code_key";

-- DropIndex
DROP INDEX "idx_document_registry_created";

-- DropIndex
DROP INDEX "idx_document_registry_metadata";

-- DropIndex
DROP INDEX "idx_goods_issue_header_reversed_by";

-- DropIndex
DROP INDEX "idx_goods_issue_items_so_line_id";

-- DropIndex
DROP INDEX "idx_goods_receipt_header_reversed_by";

-- DropIndex
DROP INDEX "idx_goods_receipt_items_lot_id";

-- DropIndex
DROP INDEX "idx_pdf_jobs_created";

-- DropIndex
DROP INDEX "idx_stock_summary_reserved";

-- AlterTable
ALTER TABLE "company_health_score_configs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customer_contact_channels" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_branding" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "document_type",
ADD COLUMN     "document_type" "DocumentType" NOT NULL;

-- AlterTable
ALTER TABLE "document_registry" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "document_type" SET DATA TYPE TEXT,
ALTER COLUMN "template_version" SET DATA TYPE TEXT,
ALTER COLUMN "storage_key" SET DATA TYPE TEXT,
ALTER COLUMN "storage_provider" SET DATA TYPE TEXT,
ALTER COLUMN "checksum" SET DATA TYPE TEXT,
ALTER COLUMN "job_id" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "generated_at" SET NOT NULL,
ALTER COLUMN "download_count" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "mime_type" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "eway_bill_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "eway_bills" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "valid_upto" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "generated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "cancelled_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "followup_threads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "goods_issue_header" DROP COLUMN "branding_version",
DROP COLUMN "reversed_by",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "goods_issue_item_lots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "goods_issue_items" DROP COLUMN "so_line_id",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "goods_receipt_header" DROP COLUMN "branding_version",
DROP COLUMN "reversed_by",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "goods_receipt_items" DROP COLUMN "lot_id",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "inventory_exceptions" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "type",
ADD COLUMN     "type" "ExceptionType" NOT NULL,
DROP COLUMN "severity",
ADD COLUMN     "severity" "ExceptionSeverity" NOT NULL,
DROP COLUMN "entity_type",
ADD COLUMN     "entity_type" "EntityType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
DROP COLUMN "resolution_type",
ADD COLUMN     "resolution_type" "ResolutionType";

-- AlterTable
ALTER TABLE "inventory_lot_alerts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_lots" DROP COLUMN "tenant_id",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoice_header" DROP COLUMN "branding_version";

-- AlterTable
ALTER TABLE "payment_receipts" DROP COLUMN "branding_version";

-- AlterTable
ALTER TABLE "pdf_jobs" DROP CONSTRAINT "pdf_jobs_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "job_type" SET NOT NULL,
ALTER COLUMN "job_type" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "progress" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ADD CONSTRAINT "pdf_jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "products" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "purchase_order_header" DROP COLUMN "branding_version",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "purchase_order_items" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "rfq_header" DROP COLUMN "branding_version";

-- AlterTable
ALTER TABLE "sales_order_header" DROP COLUMN "branding_version",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "sales_order_items" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "sales_quote_header" DROP COLUMN "branding_version";

-- AlterTable
ALTER TABLE "stock_ledger" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "stock_summary" DROP COLUMN "reserved_qty",
DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "stock_transfer_item_lots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_transfer_status_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_bill_header" DROP COLUMN "branding_version";

-- AlterTable
ALTER TABLE "supplier_payments" DROP COLUMN "branding_version";

-- AlterTable
ALTER TABLE "supplier_returns" DROP COLUMN "branding_version";

-- DropTable
DROP TABLE "platform_audit_log";

-- DropTable
DROP TABLE "stock_reservations";

-- DropTable
DROP TABLE "user_consents";

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

-- CreateTable
CREATE TABLE "recipient_engagements" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "replied" INTEGER NOT NULL DEFAULT 0,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "disputed" INTEGER NOT NULL DEFAULT 0,
    "ignored" INTEGER NOT NULL DEFAULT 0,
    "reliability" INTEGER NOT NULL DEFAULT 50,
    "preferred_hour" INTEGER,
    "last_signal_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipient_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'dunning',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "condition" JSONB NOT NULL DEFAULT '{}',
    "action" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_graphs" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latest_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workflow_graphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL,
    "graph_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "document" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_nodes" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "node_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "workflow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_timeline" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "thread_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "correlation_id" UUID,
    "kind" TEXT NOT NULL,
    "channel" TEXT,
    "node_key" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_memory" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_actions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" UUID,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_batch_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "balance_due" DOUBLE PRECISION NOT NULL,
    "tone" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "correlation_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_activities" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "recipient_engagements_company_id_reliability_idx" ON "recipient_engagements"("company_id", "reliability");

-- CreateIndex
CREATE UNIQUE INDEX "recipient_engagements_customer_id_channel_key" ON "recipient_engagements"("customer_id", "channel");

-- CreateIndex
CREATE INDEX "notification_policies_company_id_scope_enabled_priority_idx" ON "notification_policies"("company_id", "scope", "enabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_graphs_company_id_key_key" ON "workflow_graphs"("company_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_graph_id_version_key" ON "workflow_versions"("graph_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_nodes_version_id_node_key_key" ON "workflow_nodes"("version_id", "node_key");

-- CreateIndex
CREATE INDEX "notification_timeline_company_id_entity_type_entity_id_occu_idx" ON "notification_timeline"("company_id", "entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "notification_timeline_thread_id_occurred_at_idx" ON "notification_timeline"("thread_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ai_memory_company_id_scope_idx" ON "ai_memory"("company_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "ai_memory_scope_ref_id_key_key" ON "ai_memory"("scope", "ref_id", "key");

-- CreateIndex
CREATE INDEX "assistant_actions_company_id_status_kind_idx" ON "assistant_actions"("company_id", "status", "kind");

-- CreateIndex
CREATE INDEX "dispatch_batch_items_company_id_customer_id_status_idx" ON "dispatch_batch_items"("company_id", "customer_id", "status");

-- CreateIndex
CREATE INDEX "customer_activities_company_id_customer_id_created_at_idx" ON "customer_activities"("company_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_action_created_at_idx" ON "audit_logs"("company_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_branding_company_id_document_type_key" ON "document_branding"("company_id", "document_type");

-- CreateIndex
CREATE INDEX "document_registry_created_at_idx" ON "document_registry"("created_at");

-- CreateIndex
CREATE INDEX "document_registry_render_duration_ms_idx" ON "document_registry"("render_duration_ms");

-- CreateIndex
CREATE INDEX "document_registry_rendered_at_idx" ON "document_registry"("rendered_at");

-- CreateIndex
CREATE INDEX "inventory_exceptions_company_id_status_type_idx" ON "inventory_exceptions"("company_id", "status", "type");

-- CreateIndex
CREATE INDEX "inventory_exceptions_company_id_severity_status_idx" ON "inventory_exceptions"("company_id", "severity", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_exceptions_company_id_type_entity_type_entity_id__key" ON "inventory_exceptions"("company_id", "type", "entity_type", "entity_id", "status");

-- CreateIndex
CREATE INDEX "pdf_jobs_created_at_idx" ON "pdf_jobs"("created_at");

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bill_items" ADD CONSTRAINT "eway_bill_items_eway_bill_id_fkey" FOREIGN KEY ("eway_bill_id") REFERENCES "eway_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_registry" ADD CONSTRAINT "document_registry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_jobs" ADD CONSTRAINT "pdf_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "workflow_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_document_registry_cache_lookup" RENAME TO "document_registry_tenant_id_document_type_reference_id_temp_idx";

-- RenameIndex
ALTER INDEX "idx_document_registry_expires" RENAME TO "document_registry_expires_at_idx";

-- RenameIndex
ALTER INDEX "idx_document_registry_job" RENAME TO "document_registry_job_id_idx";

-- RenameIndex
ALTER INDEX "idx_document_registry_reference" RENAME TO "document_registry_reference_id_idx";

-- RenameIndex
ALTER INDEX "idx_document_registry_status" RENAME TO "document_registry_status_idx";

-- RenameIndex
ALTER INDEX "idx_document_registry_tenant_type" RENAME TO "document_registry_tenant_id_document_type_idx";

-- RenameIndex
ALTER INDEX "inventory_exceptions_dedup_idx" RENAME TO "inventory_exceptions_company_id_type_entity_type_entity_id__key";

-- RenameIndex
ALTER INDEX "inventory_exceptions_severity_idx" RENAME TO "inventory_exceptions_company_id_severity_status_idx";

-- RenameIndex
ALTER INDEX "inventory_exceptions_status_idx" RENAME TO "inventory_exceptions_company_id_status_type_idx";

-- RenameIndex
ALTER INDEX "inventory_exceptions_time_idx" RENAME TO "inventory_exceptions_company_id_last_detected_at_idx";

-- RenameIndex
ALTER INDEX "notification_deliveries_event_id_recipient_user_id_channel_a_ke" RENAME TO "notification_deliveries_event_id_recipient_user_id_channel__key";

-- RenameIndex
ALTER INDEX "idx_pdf_jobs_status" RENAME TO "pdf_jobs_status_idx";

-- RenameIndex
ALTER INDEX "idx_pdf_jobs_tenant" RENAME TO "pdf_jobs_tenant_id_idx";


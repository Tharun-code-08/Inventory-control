-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DELETED');

-- CreateEnum
CREATE TYPE "NotificationModule" AS ENUM ('GOODS_RECEIPT', 'PURCHASE_ORDER', 'RFQ', 'SALES_QUOTATION', 'WAREHOUSE_TRANSFER', 'INVENTORY', 'SECURITY', 'SYSTEM', 'APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('GOODS_RECEIPT', 'PURCHASE_ORDER', 'RFQ', 'SALES_QUOTATION', 'WAREHOUSE_TRANSFER', 'INVENTORY_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "module" "NotificationModule" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "reference_type" TEXT,
    "reference_id" TEXT,
    "deep_link" TEXT,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_by" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_registrations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_name" TEXT,
    "platform" "DevicePlatform" NOT NULL,
    "push_token" TEXT,
    "app_version" TEXT,
    "os_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "device_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "gr_created" BOOLEAN NOT NULL DEFAULT true,
    "gr_approved" BOOLEAN NOT NULL DEFAULT true,
    "gr_rejected" BOOLEAN NOT NULL DEFAULT true,
    "po_approval_required" BOOLEAN NOT NULL DEFAULT true,
    "po_approved" BOOLEAN NOT NULL DEFAULT true,
    "po_rejected" BOOLEAN NOT NULL DEFAULT true,
    "low_stock_alert" BOOLEAN NOT NULL DEFAULT true,
    "transfer_completed" BOOLEAN NOT NULL DEFAULT true,
    "inventory_adjustment" BOOLEAN NOT NULL DEFAULT true,
    "login_alert" BOOLEAN NOT NULL DEFAULT true,
    "device_alert" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "approval_type" "ApprovalType" NOT NULL,
    "reference_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "document_number" TEXT,
    "amount" DECIMAL(14,2),
    "description" TEXT,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "required_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_comments" (
    "id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_escalations" (
    "id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "escalated_to" UUID NOT NULL,
    "escalated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "approval_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "notification_id" UUID,
    "approval_id" UUID,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_status_created_at_idx" ON "notifications"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_company_id_created_at_idx" ON "notifications"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_type_priority_idx" ON "notifications"("type", "priority");

-- CreateIndex
CREATE INDEX "notifications_is_read_expires_at_idx" ON "notifications"("is_read", "expires_at");

-- CreateIndex
CREATE INDEX "device_registrations_company_id_platform_idx" ON "device_registrations"("company_id", "platform");

-- CreateIndex
CREATE INDEX "device_registrations_is_active_last_active_at_idx" ON "device_registrations"("is_active", "last_active_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_user_id_device_id_key" ON "device_registrations"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_company_id_idx" ON "notification_preferences"("company_id");

-- CreateIndex
CREATE INDEX "approval_requests_company_id_status_created_at_idx" ON "approval_requests"("company_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "approval_requests_assigned_to_status_idx" ON "approval_requests"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "approval_requests_approval_type_reference_id_idx" ON "approval_requests"("approval_type", "reference_id");

-- CreateIndex
CREATE INDEX "approval_comments_approval_id_idx" ON "approval_comments"("approval_id");

-- CreateIndex
CREATE INDEX "approval_escalations_approval_id_escalated_at_idx" ON "approval_escalations"("approval_id", "escalated_at");

-- CreateIndex
CREATE INDEX "notification_audit_logs_company_id_action_created_at_idx" ON "notification_audit_logs"("company_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "notification_audit_logs_user_id_action_idx" ON "notification_audit_logs"("user_id", "action");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_comments" ADD CONSTRAINT "approval_comments_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_comments" ADD CONSTRAINT "approval_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_escalations" ADD CONSTRAINT "approval_escalations_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_escalations" ADD CONSTRAINT "approval_escalations_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audit_logs" ADD CONSTRAINT "notification_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audit_logs" ADD CONSTRAINT "notification_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PlatformNotificationCategory" AS ENUM ('REVENUE', 'HEALTH', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PlatformNotificationSeverity" AS ENUM ('CRITICAL', 'HIGH', 'WARNING', 'INFO');

-- CreateTable
CREATE TABLE "platform_notifications" (
    "id" UUID NOT NULL,
    "category" "PlatformNotificationCategory" NOT NULL,
    "severity" "PlatformNotificationSeverity" NOT NULL DEFAULT 'INFO',
    "notification_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "action_url" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "company_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notification_reads" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "admin_email" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_notifications_created_at_idx" ON "platform_notifications"("created_at");

-- CreateIndex
CREATE INDEX "platform_notifications_category_created_at_idx" ON "platform_notifications"("category", "created_at");

-- CreateIndex
CREATE INDEX "platform_notifications_notification_key_idx" ON "platform_notifications"("notification_key");

-- CreateIndex
CREATE UNIQUE INDEX "platform_notification_reads_notification_id_admin_email_key" ON "platform_notification_reads"("notification_id", "admin_email");

-- CreateIndex
CREATE INDEX "platform_notification_reads_admin_email_idx" ON "platform_notification_reads"("admin_email");

-- AddForeignKey
ALTER TABLE "platform_notification_reads" ADD CONSTRAINT "platform_notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "platform_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification Engine — per-company rules/templates + whatsapp preference (Step 4)

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "recipient_roles" TEXT[],
    "channels" "DeliveryChannel"[],
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "sla_seconds" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "email_subject" TEXT,
    "email_body" TEXT,
    "wa_template_name" TEXT,
    "wa_language" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_rules_company_id_idx" ON "notification_rules"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rules_company_id_event_type_key" ON "notification_rules"("company_id", "event_type");

-- CreateIndex
CREATE INDEX "notification_templates_company_id_idx" ON "notification_templates"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_company_id_event_type_channel_key" ON "notification_templates"("company_id", "event_type", "channel");

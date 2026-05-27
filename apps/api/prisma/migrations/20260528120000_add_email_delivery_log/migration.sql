CREATE TABLE "email_delivery_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_delivery_log_template_entity_recipient_key"
ON "email_delivery_log"("template_id", "entity_type", "entity_id", "recipient");

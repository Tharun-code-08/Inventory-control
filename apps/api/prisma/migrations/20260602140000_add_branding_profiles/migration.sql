-- CreateEnum
CREATE TYPE "BrandingMode" AS ENUM ('LIVE', 'SNAPSHOT');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('LOGO', 'STAMP', 'SIGNATURE', 'LETTERHEAD', 'WATERMARK');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "branding_profile_id" UUID;
ALTER TABLE "shops" ADD COLUMN "branding_profile_id" UUID;

-- CreateTable
CREATE TABLE "branding_profiles" (
    "id" UUID NOT NULL,
    "branding_version" INTEGER NOT NULL DEFAULT 1,
    "logo_asset_id" UUID,
    "watermark_asset_id" UUID,
    "seal_asset_id" UUID,
    "signature_asset_id" UUID,
    "letterhead_asset_id" UUID,
    "footer_text" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "branding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "shop_id" UUID,
    "branding_profile_id" UUID,
    "type" "MediaAssetType" NOT NULL,
    "asset_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_company_id_idx" ON "media_assets"("company_id");

-- CreateIndex
CREATE INDEX "media_assets_shop_id_idx" ON "media_assets"("shop_id");

-- CreateIndex
CREATE INDEX "media_assets_branding_profile_id_idx" ON "media_assets"("branding_profile_id");

-- CreateIndex
CREATE INDEX "media_assets_type_active_idx" ON "media_assets"("type", "active");

-- AlterTable
ALTER TABLE "rfq_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'LIVE',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "goods_receipt_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "goods_issue_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "purchase_order_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sales_quote_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'LIVE',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sales_order_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "invoice_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "payment_receipts"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "supplier_returns"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "supplier_bill_header"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "supplier_payments"
  ADD COLUMN "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
  ADD COLUMN "branding_snapshot" JSONB,
  ADD COLUMN "branding_version" INTEGER,
  ADD COLUMN "template_version" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_branding_profile_id_fkey"
  FOREIGN KEY ("branding_profile_id") REFERENCES "branding_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops"
  ADD CONSTRAINT "shops_branding_profile_id_fkey"
  FOREIGN KEY ("branding_profile_id") REFERENCES "branding_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_profiles"
  ADD CONSTRAINT "branding_profiles_logo_asset_id_fkey"
  FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_profiles"
  ADD CONSTRAINT "branding_profiles_watermark_asset_id_fkey"
  FOREIGN KEY ("watermark_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_profiles"
  ADD CONSTRAINT "branding_profiles_seal_asset_id_fkey"
  FOREIGN KEY ("seal_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_profiles"
  ADD CONSTRAINT "branding_profiles_signature_asset_id_fkey"
  FOREIGN KEY ("signature_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_profiles"
  ADD CONSTRAINT "branding_profiles_letterhead_asset_id_fkey"
  FOREIGN KEY ("letterhead_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_branding_profile_id_fkey"
  FOREIGN KEY ("branding_profile_id") REFERENCES "branding_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supplier vendor profile: extended fields, GstTreatment enum, and related tables.
-- Idempotent so deploy succeeds on DBs that already received this schema.

DO $$ BEGIN
  CREATE TYPE "GstTreatment" AS ENUM (
    'REGISTERED_BUSINESS',
    'UNREGISTERED_BUSINESS',
    'COMPOSITION',
    'CONSUMER',
    'OVERSEAS',
    'SEZ',
    'DEEMED_EXPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierAddressType" AS ENUM ('BILLING', 'SHIPPING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS "display_name" TEXT,
      ADD COLUMN IF NOT EXISTS "company_name" TEXT,
      ADD COLUMN IF NOT EXISTS "salutation" TEXT,
      ADD COLUMN IF NOT EXISTS "first_name" TEXT,
      ADD COLUMN IF NOT EXISTS "last_name" TEXT,
      ADD COLUMN IF NOT EXISTS "gstin" TEXT,
      ADD COLUMN IF NOT EXISTS "gst_treatment" "GstTreatment",
      ADD COLUMN IF NOT EXISTS "source_of_supply" TEXT,
      ADD COLUMN IF NOT EXISTS "pan" TEXT,
      ADD COLUMN IF NOT EXISTS "msme_registered" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS "tds_section" TEXT,
      ADD COLUMN IF NOT EXISTS "remarks" TEXT,
      ADD COLUMN IF NOT EXISTS "work_phone" TEXT,
      ADD COLUMN IF NOT EXISTS "mobile_phone" TEXT,
      ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'English';

    CREATE INDEX IF NOT EXISTS "suppliers_display_name_idx" ON "suppliers"("display_name");
    CREATE INDEX IF NOT EXISTS "suppliers_gstin_idx" ON "suppliers"("gstin");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "supplier_addresses" (
      "id" UUID NOT NULL,
      "supplier_id" UUID NOT NULL,
      "type" "SupplierAddressType" NOT NULL,
      "attention" TEXT,
      "country" TEXT,
      "street_1" TEXT,
      "street_2" TEXT,
      "city" TEXT,
      "state" TEXT,
      "pin_code" TEXT,
      "phone" TEXT,
      "fax" TEXT,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL,
      CONSTRAINT "supplier_addresses_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "supplier_addresses_supplier_id_type_key"
      ON "supplier_addresses"("supplier_id", "type");
    CREATE INDEX IF NOT EXISTS "supplier_addresses_supplier_id_idx"
      ON "supplier_addresses"("supplier_id");

    BEGIN
      ALTER TABLE "supplier_addresses"
        ADD CONSTRAINT "supplier_addresses_supplier_id_fkey"
        FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "supplier_contacts" (
      "id" UUID NOT NULL,
      "supplier_id" UUID NOT NULL,
      "salutation" TEXT,
      "first_name" TEXT,
      "last_name" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "mobile" TEXT,
      "is_primary" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL,
      CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "supplier_contacts_supplier_id_idx"
      ON "supplier_contacts"("supplier_id");

    BEGIN
      ALTER TABLE "supplier_contacts"
        ADD CONSTRAINT "supplier_contacts_supplier_id_fkey"
        FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "supplier_bank_accounts" (
      "id" UUID NOT NULL,
      "supplier_id" UUID NOT NULL,
      "account_name" TEXT,
      "bank_name" TEXT,
      "account_number" TEXT,
      "ifsc" TEXT,
      "is_primary" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL,
      CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "supplier_bank_accounts_supplier_id_idx"
      ON "supplier_bank_accounts"("supplier_id");

    BEGIN
      ALTER TABLE "supplier_bank_accounts"
        ADD CONSTRAINT "supplier_bank_accounts_supplier_id_fkey"
        FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

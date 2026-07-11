-- Create suppliers, contract_header and contract_item tables (were missing from init but defined in schema)
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplier_code" VARCHAR(255) NOT NULL UNIQUE,
  "supplier_name" VARCHAR(255) NOT NULL,
  "company_id" UUID,
  "tax_id" VARCHAR(255),
  "vat_number" VARCHAR(255),
  "rating" INTEGER NOT NULL DEFAULT 0,
  "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "contact_person" VARCHAR(255),
  "email" VARCHAR(255),
  "phone" VARCHAR(255),
  "street" VARCHAR(255),
  "city" VARCHAR(255),
  "state" VARCHAR(255),
  "postal_code" VARCHAR(255),
  "country" VARCHAR(255),
  "payment_terms" TEXT,
  "bank_name" VARCHAR(255),
  "account_number" VARCHAR(255),
  "routing_number" VARCHAR(255),
  "iban" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by" UUID,
  "updated_by" UUID,
  "deleted_at" TIMESTAMPTZ,
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "contract_header" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "contract_number" VARCHAR(255) NOT NULL UNIQUE,
  "shop_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "rfq_id" UUID,
  "quotation_id" UUID,
  "title" VARCHAR(255) NOT NULL,
  "payment_terms" TEXT,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "notes" TEXT,
  "status" VARCHAR(255) NOT NULL DEFAULT 'DRAFT',
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by" UUID,
  "updated_by" UUID,
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("quotation_id") REFERENCES "supplier_quotation_header"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "contract_item" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "contract_id" UUID NOT NULL,
  "product_id" UUID,
  "description" TEXT,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "uom" VARCHAR(255) NOT NULL,
  "unit_price" DECIMAL(12, 2) NOT NULL,
  "line_value" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by" UUID,
  "updated_by" UUID,
  FOREIGN KEY ("contract_id") REFERENCES "contract_header"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "suppliers_company_id_idx" ON "suppliers" ("company_id");
CREATE INDEX IF NOT EXISTS "contract_header_shop_id_start_date_idx" ON "contract_header" ("shop_id", "start_date");
CREATE INDEX IF NOT EXISTS "contract_header_supplier_id_idx" ON "contract_header" ("supplier_id");
CREATE INDEX IF NOT EXISTS "contract_item_contract_id_idx" ON "contract_item" ("contract_id");
CREATE INDEX IF NOT EXISTS "contract_item_product_id_idx" ON "contract_item" ("product_id");

-- Fix DocumentRegistry schema: make referenceId optional, add metadata, remove pdf_cache

-- Step 1: Add metadata column
ALTER TABLE "document_registry" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Step 2: Make reference_id nullable (drop NOT NULL constraint)
ALTER TABLE "document_registry" ALTER COLUMN "reference_id" DROP NOT NULL;

-- Step 3: Add composite index for cache lookups
-- (Check if it already exists before creating)
CREATE INDEX IF NOT EXISTS idx_document_registry_cache_lookup
  ON document_registry(tenant_id, document_type, reference_id, template_version, status);

-- Step 4: Drop pdf_cache table (no longer needed)
DROP TABLE IF EXISTS "pdf_cache" CASCADE;

-- Step 5: Add index on metadata for filtering by metadata keys (future use)
CREATE INDEX IF NOT EXISTS idx_document_registry_metadata
  ON document_registry USING GIN(metadata);

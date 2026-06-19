-- Add mimeType field to DocumentRegistry
ALTER TABLE "document_registry"
ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100) NOT NULL DEFAULT 'application/pdf';

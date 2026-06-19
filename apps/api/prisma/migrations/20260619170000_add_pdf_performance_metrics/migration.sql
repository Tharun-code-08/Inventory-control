-- Add PDF performance tracking columns to document_registry
ALTER TABLE "document_registry"
ADD COLUMN IF NOT EXISTS "render_duration_ms" INTEGER,
ADD COLUMN IF NOT EXISTS "rendered_at" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "storage_latency_ms" INTEGER;

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_document_registry_render_duration
  ON document_registry(render_duration_ms)
  WHERE render_duration_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_registry_rendered_at
  ON document_registry(rendered_at DESC)
  WHERE rendered_at IS NOT NULL;

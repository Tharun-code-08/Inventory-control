-- Document Registry: Single source of truth for all generated PDFs
CREATE TABLE IF NOT EXISTS "document_registry" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,

  -- Template & versioning
  template_version VARCHAR(20) NOT NULL DEFAULT '1.0',

  -- Storage
  storage_key VARCHAR(500) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
  file_size_bytes BIGINT,
  checksum VARCHAR(64),

  -- Job tracking
  job_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, expired

  -- Metadata
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for queries
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_registry_tenant_type ON document_registry(tenant_id, document_type);
CREATE INDEX idx_document_registry_reference ON document_registry(reference_id);
CREATE INDEX idx_document_registry_status ON document_registry(status);
CREATE INDEX idx_document_registry_job ON document_registry(job_id);
CREATE INDEX idx_document_registry_expires ON document_registry(expires_at);
CREATE INDEX idx_document_registry_created ON document_registry(created_at DESC);

-- PDF Jobs Queue: Track BullMQ jobs
CREATE TABLE IF NOT EXISTS "pdf_jobs" (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id UUID NOT NULL,
  document_id UUID,
  job_type VARCHAR(50),
  status VARCHAR(50),
  progress INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_pdf_jobs_tenant ON pdf_jobs(tenant_id);
CREATE INDEX idx_pdf_jobs_status ON pdf_jobs(status);
CREATE INDEX idx_pdf_jobs_created ON pdf_jobs(created_at DESC);

-- PDF Cache: Store rendered PDFs temporarily
CREATE TABLE IF NOT EXISTS "pdf_cache" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  cache_key VARCHAR(256) NOT NULL UNIQUE,
  storage_key VARCHAR(500),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pdf_cache_document ON pdf_cache(document_id);
CREATE INDEX idx_pdf_cache_expires ON pdf_cache(expires_at);

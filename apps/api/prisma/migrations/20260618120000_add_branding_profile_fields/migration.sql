-- Add branding profile fields
ALTER TABLE "branding_profiles" 
  ADD COLUMN IF NOT EXISTS "company_name" TEXT,
  ADD COLUMN IF NOT EXISTS "gst_number" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_color" TEXT,
  ADD COLUMN IF NOT EXISTS "secondary_color" TEXT,
  ADD COLUMN IF NOT EXISTS "accent_color" TEXT;

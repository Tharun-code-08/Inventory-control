-- RFQ close and contract terminate used to overwrite the notes field and leave
-- the document active. Record the event in its own column instead.
ALTER TABLE "rfq_header" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMPTZ(6);
ALTER TABLE "contract_header" ADD COLUMN IF NOT EXISTS "terminated_at" TIMESTAMPTZ(6);

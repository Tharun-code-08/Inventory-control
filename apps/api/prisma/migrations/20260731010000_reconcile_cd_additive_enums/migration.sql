-- Schema↔migrations reconciliation — Category D, ADDITIVE enum values only.
--
-- These enum values are declared in schema.prisma but the migrations never added
-- them, so the app can attempt to write a value the DB enum rejects. Adding them
-- is non-destructive and closes that runtime risk. See
-- docs/workflow-engine/SCHEMA-RECONCILIATION-CD-DECISIONS.md.
--
-- The DESTRUCTIVE / decision-gated items (orphan tables & columns; DB-only enum
-- values that would require a retype) are NOT in this migration — they are in
-- the decision doc and must be resolved deliberately with data audits.
--
-- Idempotent: ADD VALUE IF NOT EXISTS is a no-op where the value already exists.

ALTER TYPE "EwayDocumentType"    ADD VALUE IF NOT EXISTS 'BILL_OF_ENTRY';
ALTER TYPE "EwayDocumentType"    ADD VALUE IF NOT EXISTS 'OTHERS';

ALTER TYPE "EwayTransactionType" ADD VALUE IF NOT EXISTS 'BILL_TO_SHIP_TO';
ALTER TYPE "EwayTransactionType" ADD VALUE IF NOT EXISTS 'BILL_FROM_DISPATCH_FROM';
ALTER TYPE "EwayTransactionType" ADD VALUE IF NOT EXISTS 'COMBINATION';

ALTER TYPE "EwayVehicleType"     ADD VALUE IF NOT EXISTS 'ODC';

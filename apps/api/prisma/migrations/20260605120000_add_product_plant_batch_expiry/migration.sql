-- Batch and expiry captured at product assignment (opening stock / bulk import).
ALTER TABLE "product_plants"
  ADD COLUMN "batch_number" TEXT,
  ADD COLUMN "expiry_date" DATE;

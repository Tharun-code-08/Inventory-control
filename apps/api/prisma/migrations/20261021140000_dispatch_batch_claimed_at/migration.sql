-- Digest items were marked SENT before the digest was sent, so a failed or
-- crashed flush lost them. Flushes now claim rows as SENDING with a timestamp
-- and only mark them SENT after the send.
ALTER TABLE "dispatch_batch_items" ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMPTZ(6);

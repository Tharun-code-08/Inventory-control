-- Per-user channel-link metadata (notification preferences, future extensions).
-- JSONB with an empty-object default so existing rows are never NULL.
ALTER TABLE "user_channel_links"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

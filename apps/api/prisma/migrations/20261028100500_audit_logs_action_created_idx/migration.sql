-- audit_logs is written on every audited request, so build without blocking writes.
-- CONCURRENTLY cannot run inside a transaction, so this file holds a single statement.
-- If the build fails it leaves an INVALID index: drop it
-- (DROP INDEX CONCURRENTLY "audit_logs_action_created_at_idx") before retrying.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

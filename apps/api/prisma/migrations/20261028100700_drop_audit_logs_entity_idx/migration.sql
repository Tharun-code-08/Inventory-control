-- Superseded by audit_logs_entity_type_entity_id_created_at_idx, which serves
-- every query this two-column index did. CONCURRENTLY: single statement per file.
DROP INDEX CONCURRENTLY IF EXISTS "audit_logs_entity_type_entity_id_idx";

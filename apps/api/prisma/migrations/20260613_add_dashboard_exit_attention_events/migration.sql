-- Phase 3 Week 4: Add dashboard exit tracking and attention item resolution events
-- Enables complete session telemetry and attention card action tracking
--   DASHBOARD_EXIT           -> session duration, cards viewed, actions taken, first card, opened/closed times
--   ATTENTION_ITEM_RESOLVED  -> attention item type, ID, resolution method

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DASHBOARD_EXIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENTION_ITEM_RESOLVED';

-- Phase 3 Month 1: Dashboard telemetry actions
-- Enables the Week 4 Reality Report to read behavior from the audit log:
--   VIEW_DASHBOARD          -> opens by hour-of-day, consecutive days, Morning Ritual Score
--   DASHBOARD_CARD_CLICKED  -> first-click distribution (metadata.firstClick, metadata.card)
--   DASHBOARD_ACTION_TAKEN  -> actions per session (metadata.action)
--
-- Postgres requires ADD VALUE outside a transaction; each is idempotent via IF NOT EXISTS.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'VIEW_DASHBOARD';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DASHBOARD_CARD_CLICKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DASHBOARD_ACTION_TAKEN';

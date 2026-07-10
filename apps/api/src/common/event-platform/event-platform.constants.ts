/** BullMQ queue that drives the outbox relay tick. */
export const EVENT_RELAY_QUEUE = 'event-relay';

/** Repeatable job id + cadence (ms) for the relay tick. */
export const EVENT_RELAY_JOB_ID = 'event-relay-tick';
export const EVENT_RELAY_INTERVAL_MS = 5000;

/** Maintenance queue + daily retention-cleanup job. */
export const EVENT_PLATFORM_MAINTENANCE_QUEUE = 'event-platform-maintenance';
export const RETENTION_JOB = 'retention-cleanup';
/** Daily at 03:30 UTC (off-peak). */
export const RETENTION_CRON = '30 3 * * *';

export const PLATFORM_CHECKS_QUEUE = 'platform-checks';

export const PLATFORM_NOTIFICATION_KEYS = {
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  FAILED_RENEWAL: 'failed_renewal',
  REVENUE_MILESTONE: 'revenue_milestone',
  DB_STORAGE_80: 'db_storage_80',
  DB_STORAGE_90: 'db_storage_90',
  API_ERROR_RATE_HIGH: 'api_error_rate_high',
  SERVER_CPU_HIGH: 'server_cpu_high',
  SERVER_MEMORY_HIGH: 'server_memory_high',
  VPS_DISK_LOW: 'vps_disk_low',
  QUEUE_BACKLOG_HIGH: 'queue_backlog_high',
} as const;

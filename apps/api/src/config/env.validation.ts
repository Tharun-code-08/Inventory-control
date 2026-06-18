import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'staging', 'test').default('development'),
  API_PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().trim().min(32).required(),
  REFRESH_SECRET: Joi.string().trim().min(32).required(),
  COOKIE_SECRET: Joi.string().trim().min(32).optional(),

  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('session_id'),
  AUTH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').optional(),

  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
  INVITE_TTL_HOURS: Joi.number().integer().min(1).max(168).default(72),

  WEB_ORIGIN: Joi.string().optional(),
  /** Public SPA base URL for links in outbound emails (defaults to first WEB_ORIGIN). */
  PUBLIC_WEB_URL: Joi.string().uri().optional(),
  ALLOW_TUNNEL_ORIGINS: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),

  // SMTP — required to email suppliers when an RFQ is sent.
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_SECURE: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  /** Defaults to SMTP_USER when unset (required for Zoho and most SMTP providers). */
  MAIL_FROM: Joi.string().email().optional(),
  MAIL_REPLY_TO: Joi.string().email().optional(),
  /** Optional BCC copy (e.g. office@…) for outbound quotation emails. */
  MAIL_BCC: Joi.string().email().optional(),
  ADMIN_NOTIFICATION_EMAIL: Joi.string().email().optional(),
  /** Comma-separated emails allowed to access /platform/* APIs and UI. */
  PLATFORM_ADMIN_EMAILS: Joi.string().trim().empty('').optional(),

  RATE_LIMIT_AUTH_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_AUTH_LIMIT: Joi.number().integer().min(1).default(10),
  RATE_LIMIT_GLOBAL_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_GLOBAL_LIMIT: Joi.number().integer().min(1).default(120),

  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  EXPORT_STORAGE_DIR: Joi.string().default('./storage/exports'),
  UPLOAD_STORAGE_DIR: Joi.string().default('./storage/uploads'),

  // Optional: webhook URL for outbound alert deliveries; when unset the
  // notifications worker still drains queue jobs but does not POST anywhere.
  NOTIFICATIONS_WEBHOOK_URL: Joi.string().uri().optional(),
  NOTIFICATIONS_TIMEOUT_MS: Joi.number().integer().min(1_000).max(60_000).default(5_000),

  // Phase 3 lockout knobs (used by AuthService).
  LOCKOUT_THRESHOLD: Joi.number().integer().min(3).max(20).default(5),
  LOCKOUT_DURATION_MIN: Joi.number().integer().min(1).max(720).default(15),

  SIGNUP_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),
  SIGNUP_OTP_TTL_MIN: Joi.number().integer().min(5).max(60).default(15),
  SIGNUP_OTP_MAX_ATTEMPTS: Joi.number().integer().min(3).max(10).default(5),
  MFA_CHALLENGE_TTL_MIN: Joi.number().integer().min(5).max(60).default(15),
  MFA_LOGIN_MAX_ATTEMPTS: Joi.number().integer().min(3).max(10).default(5),
  MFA_BACKUP_CODE_COUNT: Joi.number().integer().min(4).max(20).default(8),
  MFA_TRUSTED_DEVICE_DAYS: Joi.number().integer().min(1).max(30).default(7),
  MFA_SECRET_ENCRYPTION_KEY: Joi.string().trim().empty('').optional(),
  /** Optional Cloudflare Turnstile; empty string in .env is treated as unset. */
  TURNSTILE_SITE_KEY: Joi.string().trim().empty('').optional(),
  TURNSTILE_SECRET_KEY: Joi.string().trim().empty('').optional(),

  // Phase 2 observability knobs.
  SLOW_QUERY_MS: Joi.number().integer().min(50).default(200),
  SENTRY_DSN: Joi.string().uri().optional(),
  SENTRY_ENVIRONMENT: Joi.string().optional(),
  SENTRY_RELEASE: Joi.string().optional(),

  APP_DEBUG: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),

  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),
  /** Demo: charge Plus at this INR amount (e.g. 5). Unset to restore ₹599/₹549 pricing. */
  BILLING_DEMO_PLUS_PRICE_INR: Joi.number().integer().min(1).optional(),

  BACKUP_FEATURE_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),
  BACKUP_STORAGE_DIR: Joi.string().default('./storage/backups'),
  BACKUP_ENCRYPTION_KEY: Joi.string().trim().empty('').optional(),
  GOOGLE_OAUTH_CLIENT_ID: Joi.string().trim().empty('').optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().trim().empty('').optional(),
  GOOGLE_OAUTH_REDIRECT_URI: Joi.string().uri().optional(),
});

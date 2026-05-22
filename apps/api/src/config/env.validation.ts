import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().trim().min(32).required(),
  REFRESH_SECRET: Joi.string().trim().min(32).required(),
  COOKIE_SECRET: Joi.string().trim().min(32).optional(),

  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('refreshToken'),
  AUTH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').optional(),

  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),

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
  MAIL_FROM: Joi.string().email().default('office@softdigitconsulting.com'),
  ADMIN_NOTIFICATION_EMAIL: Joi.string().email().optional(),

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

  // Phase 2 observability knobs.
  SLOW_QUERY_MS: Joi.number().integer().min(50).default(200),
  SENTRY_DSN: Joi.string().uri().optional(),
  SENTRY_ENVIRONMENT: Joi.string().optional(),
  SENTRY_RELEASE: Joi.string().optional(),

  APP_DEBUG: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),
});

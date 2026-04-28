import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('refreshToken'),
  REFRESH_SECRET: Joi.string().min(16).required(),
  WEB_ORIGIN: Joi.string().optional(),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  EXPORT_STORAGE_DIR: Joi.string().default('./storage/exports'),
});

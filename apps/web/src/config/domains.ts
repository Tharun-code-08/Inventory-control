/**
 * Domain configuration for SoftDigit applications.
 * Centralized to make it easy to update URLs across the app.
 */

export const DOMAINS = {
  MARKETING: 'softdigitconsulting.com',
  IMS: 'ims.softdigitconsulting.com',
  API: 'api.softdigitconsulting.com',
} as const;

/**
 * Full URLs for navigation
 */
export const URLS = {
  IMS_LOGIN: `https://${DOMAINS.IMS}/login`,
  IMS_SIGNUP: `https://${DOMAINS.IMS}/signup`,
  IMS_DASHBOARD: `https://${DOMAINS.IMS}/dashboard`,
} as const;

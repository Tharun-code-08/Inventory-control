export const SUBSCRIPTION_LIFECYCLE_QUEUE = 'subscription-lifecycle';

export const SOFTDIGIT_PLATFORM = {
  gstNumber: process.env.PLATFORM_GSTIN?.trim() || '29XXXXX0000X1Z5',
  companyName: 'Softdigit Consulting',
  email: 'office@softdigitconsulting.com',
} as const;

export function platformWebBaseUrl(configured?: string | null): string {
  const base = configured?.trim() || process.env.WEB_APP_URL?.trim() || process.env.APP_URL?.trim() || 'http://localhost:5173';
  return base.replace(/\/+$/, '');
}

export function trackedUrl(baseUrl: string, logId: string, targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `${baseUrl}/api/t/email/${logId}?u=${encoded}`;
}

export function marketingUnsubscribeUrl(baseUrl: string, companyId: string): string {
  return `${baseUrl}/upgrade?unsubscribe=1&company=${companyId}`;
}

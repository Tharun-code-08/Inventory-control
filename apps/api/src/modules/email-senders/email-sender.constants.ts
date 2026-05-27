export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'yahoo.co.in',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'zoho.in',
  'rediffmail.com',
]);

export const SENDER_OTP_EXPIRY_MINUTES = 10;
export const SENDER_OTP_MAX_ATTEMPTS = 5;

export const NO_VERIFIED_SENDER_MESSAGE =
  'Configure and verify a sender email in Settings > Customization > Email Notifications.';

export type ResolvedTenantSender = {
  fromEmail: string;
  fromName: string;
  replyTo: string;
  mode: 'tenant_direct' | 'tenant_relay';
  senderEmail: string;
  displayName: string;
};

export function parseEmailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).toLowerCase().trim();
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

export function normalizeSenderEmail(email: string): string {
  return email.trim().toLowerCase();
}

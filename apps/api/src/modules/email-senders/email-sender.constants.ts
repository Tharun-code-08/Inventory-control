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

export type SenderSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

export const GMAIL_SMTP_PRESET: Omit<SenderSmtpConfig, 'user' | 'password'> = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
};

export const OUTLOOK_SMTP_PRESET: Omit<SenderSmtpConfig, 'user' | 'password'> = {
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
};

export const ZOHO_SMTP_PRESET: Omit<SenderSmtpConfig, 'user' | 'password'> = {
  host: 'smtp.zoho.com',
  port: 587,
  secure: false,
};

export type ResolvedTenantSender = {
  senderId: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  mode: 'tenant_smtp';
  senderEmail: string;
  displayName: string;
  smtp: SenderSmtpConfig;
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

export function isGmailDomain(email: string): boolean {
  const domain = parseEmailDomain(email);
  return domain === 'gmail.com' || domain === 'googlemail.com';
}

export declare const PUBLIC_EMAIL_DOMAINS: Set<string>;
export declare const SENDER_OTP_EXPIRY_MINUTES = 10;
export declare const SENDER_OTP_MAX_ATTEMPTS = 5;
export declare const NO_VERIFIED_SENDER_MESSAGE = "Configure and verify a sender email in Settings > Customization > Email Notifications.";
export type SenderSmtpConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
};
export declare const GMAIL_SMTP_PRESET: Omit<SenderSmtpConfig, 'user' | 'password'>;
export declare const OUTLOOK_SMTP_PRESET: Omit<SenderSmtpConfig, 'user' | 'password'>;
export declare const ZOHO_SMTP_PRESET: Omit<SenderSmtpConfig, 'user' | 'password'>;
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
export declare function parseEmailDomain(email: string): string;
export declare function isPublicEmailDomain(domain: string): boolean;
export declare function normalizeSenderEmail(email: string): string;
export declare function isGmailDomain(email: string): boolean;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZOHO_SMTP_PRESET = exports.OUTLOOK_SMTP_PRESET = exports.GMAIL_SMTP_PRESET = exports.NO_VERIFIED_SENDER_MESSAGE = exports.SENDER_OTP_MAX_ATTEMPTS = exports.SENDER_OTP_EXPIRY_MINUTES = exports.PUBLIC_EMAIL_DOMAINS = void 0;
exports.parseEmailDomain = parseEmailDomain;
exports.isPublicEmailDomain = isPublicEmailDomain;
exports.normalizeSenderEmail = normalizeSenderEmail;
exports.isGmailDomain = isGmailDomain;
exports.PUBLIC_EMAIL_DOMAINS = new Set([
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
exports.SENDER_OTP_EXPIRY_MINUTES = 10;
exports.SENDER_OTP_MAX_ATTEMPTS = 5;
exports.NO_VERIFIED_SENDER_MESSAGE = 'Configure and verify a sender email in Settings > Customization > Email Notifications.';
exports.GMAIL_SMTP_PRESET = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
};
exports.OUTLOOK_SMTP_PRESET = {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
};
exports.ZOHO_SMTP_PRESET = {
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
};
function parseEmailDomain(email) {
    const at = email.lastIndexOf('@');
    if (at < 0)
        return '';
    return email.slice(at + 1).toLowerCase().trim();
}
function isPublicEmailDomain(domain) {
    return exports.PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}
function normalizeSenderEmail(email) {
    return email.trim().toLowerCase();
}
function isGmailDomain(email) {
    const domain = parseEmailDomain(email);
    return domain === 'gmail.com' || domain === 'googlemail.com';
}
//# sourceMappingURL=email-sender.constants.js.map
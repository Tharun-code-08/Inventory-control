"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlatformAdminEmails = parsePlatformAdminEmails;
exports.parsePlatformAdminEmailsFromConfig = parsePlatformAdminEmailsFromConfig;
exports.isPlatformAdminEmail = isPlatformAdminEmail;
function parsePlatformAdminEmails(raw) {
    const value = raw ??
        process.env.PLATFORM_ADMIN_EMAILS ??
        '';
    return new Set(value
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean));
}
function parsePlatformAdminEmailsFromConfig(config) {
    return parsePlatformAdminEmails(config.get('PLATFORM_ADMIN_EMAILS'));
}
function isPlatformAdminEmail(email, allowlist) {
    if (!email?.trim())
        return false;
    return allowlist.has(email.trim().toLowerCase());
}
//# sourceMappingURL=platform-admin.util.js.map
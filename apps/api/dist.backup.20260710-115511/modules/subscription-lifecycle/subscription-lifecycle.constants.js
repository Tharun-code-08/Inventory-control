"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOFTDIGIT_PLATFORM = exports.SUBSCRIPTION_LIFECYCLE_QUEUE = void 0;
exports.platformWebBaseUrl = platformWebBaseUrl;
exports.trackedUrl = trackedUrl;
exports.marketingUnsubscribeUrl = marketingUnsubscribeUrl;
exports.SUBSCRIPTION_LIFECYCLE_QUEUE = 'subscription-lifecycle';
exports.SOFTDIGIT_PLATFORM = {
    gstNumber: process.env.PLATFORM_GSTIN?.trim() || '29XXXXX0000X1Z5',
    companyName: 'Softdigit Consulting',
    email: 'office@softdigitconsulting.com',
};
function platformWebBaseUrl(configured) {
    const base = configured?.trim() || process.env.WEB_APP_URL?.trim() || process.env.APP_URL?.trim() || 'http://localhost:5173';
    return base.replace(/\/+$/, '');
}
function trackedUrl(baseUrl, logId, targetUrl) {
    const encoded = encodeURIComponent(targetUrl);
    return `${baseUrl}/api/t/email/${logId}?u=${encoded}`;
}
function marketingUnsubscribeUrl(baseUrl, companyId) {
    return `${baseUrl}/upgrade?unsubscribe=1&company=${companyId}`;
}
//# sourceMappingURL=subscription-lifecycle.constants.js.map
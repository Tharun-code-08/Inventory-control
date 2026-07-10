"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePublicWebOrigin = resolvePublicWebOrigin;
exports.buildSupplierPortalSubmitUrl = buildSupplierPortalSubmitUrl;
exports.buildSupplierDeleteConfirmUrl = buildSupplierDeleteConfirmUrl;
exports.buildSupplierReturnAckUrl = buildSupplierReturnAckUrl;
exports.buildQuotationPortalReviewUrl = buildQuotationPortalReviewUrl;
exports.buildUserInviteAcceptUrl = buildUserInviteAcceptUrl;
exports.buildPasswordResetUrl = buildPasswordResetUrl;
function resolvePublicWebOrigin(config) {
    const explicit = config.get('PUBLIC_WEB_URL')?.trim();
    if (explicit)
        return explicit.replace(/\/$/, '');
    const webOrigin = config.get('WEB_ORIGIN')?.trim();
    if (webOrigin) {
        const first = webOrigin.split(',')[0]?.trim();
        if (first)
            return first.replace(/\/$/, '');
    }
    return 'http://localhost:5173';
}
function buildSupplierPortalSubmitUrl(config, rfqId) {
    const origin = resolvePublicWebOrigin(config);
    return `${origin}/supplier-portal/submit?rfq=${encodeURIComponent(rfqId)}`;
}
function buildSupplierDeleteConfirmUrl(config, token) {
    const origin = resolvePublicWebOrigin(config);
    return `${origin}/supplier-delete/confirm?token=${encodeURIComponent(token)}`;
}
function buildSupplierReturnAckUrl(config, token) {
    const origin = resolvePublicWebOrigin(config);
    return `${origin}/returns/acknowledge?token=${encodeURIComponent(token)}`;
}
function buildQuotationPortalReviewUrl(config, portalToken) {
    const origin = resolvePublicWebOrigin(config);
    return `${origin}/quotation-portal/review?token=${encodeURIComponent(portalToken)}`;
}
function buildUserInviteAcceptUrl(config, token) {
    const origin = resolvePublicWebOrigin(config);
    return `${origin}/invite/accept?token=${encodeURIComponent(token)}`;
}
function buildPasswordResetUrl(config, token) {
    const origin = resolvePublicWebOrigin(config);
    return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}
//# sourceMappingURL=portal-url.js.map
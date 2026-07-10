"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformCtaButton = platformCtaButton;
exports.platformBenefitsList = platformBenefitsList;
exports.platformSupportFooter = platformSupportFooter;
exports.platformParagraph = platformParagraph;
function platformCtaButton(cta) {
    const label = escapeHtml(cta.label);
    const url = escapeHtml(cta.url);
    return `<p style="margin:24px 0 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background:#4338ca;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
  </p>`;
}
function platformBenefitsList(items) {
    const lis = items.map((item) => `<li style="margin:6px 0;">${escapeHtml(item)}</li>`).join('');
    return `<ul style="margin:16px 0;padding-left:20px;color:#334155;line-height:1.6;">${lis}</ul>`;
}
function platformSupportFooter(unsubscribeUrl) {
    const unsub = unsubscribeUrl
        ? `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;">Unsubscribe from marketing emails</a></p>`
        : '';
    return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
      Need help? Reply to this email or contact
      <a href="mailto:office@softdigitconsulting.com" style="color:#4338ca;">office@softdigitconsulting.com</a>.
    </p>
    ${unsub}`;
}
function platformParagraph(text) {
    return `<p style="margin:0 0 12px;color:#334155;line-height:1.6;font-size:15px;">${escapeHtml(text)}</p>`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
//# sourceMappingURL=platform-email.shared.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rfqInviteSubject = rfqInviteSubject;
exports.rfqInviteText = rfqInviteText;
exports.rfqInviteHtml = rfqInviteHtml;
function rfqInviteSubject(content) {
    return `RFQ ${content.rfqNumber} — ${content.rfqTitle}`;
}
function rfqInviteText(content) {
    const lines = [
        `Hello ${content.supplierName},`,
        '',
        `You have been invited to submit a quotation for:`,
        `  ${content.rfqNumber} — ${content.rfqTitle}`,
    ];
    if (content.deadline) {
        lines.push(`  Response deadline: ${content.deadline}`);
    }
    lines.push('', 'Open the Supplier Portal to verify your identity and submit your quote:', content.portalUrl, '', `RFQ reference (optional on verify screen): ${content.accessCode}`, '', 'Thank you,', 'SoftdigitIMS Procurement');
    return lines.join('\n');
}
function rfqInviteHtml(content) {
    const deadlineRow = content.deadline
        ? `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Deadline</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(content.deadline)}</td></tr>`
        : '';
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81,#4338ca);padding:24px 28px;">
              <p style="margin:0;font-size:12px;color:#c7d2fe;letter-spacing:0.08em;text-transform:uppercase;">SoftdigitIMS</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Supplier Portal</h1>
              <p style="margin:6px 0 0;font-size:14px;color:#e0e7ff;">Request for quotation</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hello <strong>${escapeHtml(content.supplierName)}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.5;">
                You have been invited to review an RFQ and submit your quotation through our secure supplier portal.
              </p>
              <table width="100%" style="margin:0 0 24px;background:#f8fafc;border-radius:8px;padding:12px 16px;">
                <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">RFQ</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(content.rfqNumber)}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Title</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(content.rfqTitle)}</td></tr>
                ${deadlineRow}
              </table>
              <p style="margin:0 0 20px;text-align:center;">
                <a href="${escapeHtml(content.portalUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">
                  Open Supplier Portal
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or copy this link:</p>
              <p style="margin:0 0 20px;font-size:13px;word-break:break-all;"><a href="${escapeHtml(content.portalUrl)}" style="color:#4338ca;">${escapeHtml(content.portalUrl)}</a></p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">RFQ reference (optional): <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escapeHtml(content.accessCode)}</code></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">Powered by SoftdigitIMS · Supplier Portal</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
//# sourceMappingURL=rfq-invite.template.js.map
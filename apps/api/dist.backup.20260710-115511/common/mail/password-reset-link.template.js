"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetLinkSubject = passwordResetLinkSubject;
exports.passwordResetLinkText = passwordResetLinkText;
exports.passwordResetLinkHtml = passwordResetLinkHtml;
function passwordResetLinkSubject() {
    return 'Password reset link - SoftdigitIMS';
}
function passwordResetLinkText(content) {
    return [
        `Hello ${content.userName},`,
        '',
        'We received a request to reset your SoftdigitIMS password.',
        '',
        'Open the secure link below to choose a new password:',
        content.resetUrl,
        '',
        `This link expires in ${content.expiresMinutes} minutes and works only once.`,
        'If you request another reset link, older links will stop working immediately.',
        '',
        'If you did not request this, you can ignore this email.',
        '',
        'Softdigit Consulting',
        'office@softdigitconsulting.com',
    ].join('\n');
}
function passwordResetLinkHtml(content) {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#312e81);padding:24px 28px;">
              <p style="margin:0;font-size:12px;color:#c7d2fe;letter-spacing:0.08em;text-transform:uppercase;">SoftdigitIMS</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Reset your password</h1>
              <p style="margin:6px 0 0;font-size:14px;color:#e0e7ff;">Secure magic link for your account</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hello <strong>${escapeHtml(content.userName)}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.5;">
                Click the button below to choose a new password for your SoftdigitIMS account.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${escapeAttribute(content.resetUrl)}" style="display:inline-block;background:#312e81;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:10px;">
                  Reset password
                </a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-align:center;">
                Expires in <strong>${content.expiresMinutes} minutes</strong>
              </p>
              <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                Sent to ${escapeHtml(content.email)}. This link is single-use, and requesting a new one will invalidate the old link.
                If you did not request this, you can safely ignore this message.
              </p>
              <p style="margin:20px 0 0;font-size:12px;color:#64748b;line-height:1.5;">
                If the button does not work, copy and paste this URL into your browser:<br />
                <span style="word-break:break-all;">${escapeHtml(content.resetUrl)}</span>
              </p>
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
function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
}
//# sourceMappingURL=password-reset-link.template.js.map
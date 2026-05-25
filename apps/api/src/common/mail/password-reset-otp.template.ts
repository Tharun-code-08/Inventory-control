export type PasswordResetOtpEmailContent = {
  userName: string;
  email: string;
  otpCode: string;
  expiresMinutes: number;
};

export function passwordResetOtpSubject(): string {
  return 'Reset your password - Retail IMS';
}

export function passwordResetOtpText(content: PasswordResetOtpEmailContent): string {
  return [
    `Hello ${content.userName},`,
    '',
    'We received a request to reset your Retail IMS password.',
    '',
    `Your reset code is: ${content.otpCode}`,
    '',
    `This code expires in ${content.expiresMinutes} minutes and can only be used once.`,
    'If you request another code, this one will stop working immediately.',
    '',
    'If you did not request this, you can ignore this email.',
    '',
    'Softdigit Consulting',
    'office@softdigitconsulting.com',
  ].join('\n');
}

export function passwordResetOtpHtml(content: PasswordResetOtpEmailContent): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#312e81);padding:24px 28px;">
              <p style="margin:0;font-size:12px;color:#c7d2fe;letter-spacing:0.08em;text-transform:uppercase;">Retail IMS</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Reset your password</h1>
              <p style="margin:6px 0 0;font-size:14px;color:#e0e7ff;">Use this one-time code to continue</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hello <strong>${escapeHtml(content.userName)}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.5;">
                Enter the verification code below in the forgot-password page to set a new password.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <span style="display:inline-block;letter-spacing:0.35em;font-size:28px;font-weight:700;color:#312e81;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px 24px;">
                  ${escapeHtml(content.otpCode)}
                </span>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-align:center;">
                Expires in <strong>${content.expiresMinutes} minutes</strong>
              </p>
              <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                Sent to ${escapeHtml(content.email)}. This code is single-use, and requesting a new code will invalidate the old one.
                If you did not request this, you can safely ignore this message.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

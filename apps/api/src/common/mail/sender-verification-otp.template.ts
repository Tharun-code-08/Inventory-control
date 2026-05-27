export type SenderVerificationOtpContent = {
  displayName: string;
  email: string;
  otpCode: string;
  expiresMinutes: number;
  companyName: string;
};

export function senderVerificationOtpSubject(companyName: string): string {
  return `Verify your sender email for ${companyName}`;
}

export function senderVerificationOtpText(content: SenderVerificationOtpContent): string {
  return [
    `Hello${content.displayName ? ` ${content.displayName}` : ''},`,
    '',
    `Use this verification code to confirm ${content.email} as a sender address for ${content.companyName} on Retail IMS:`,
    '',
    content.otpCode,
    '',
    `This code expires in ${content.expiresMinutes} minutes.`,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    'Softdigit Consulting',
  ].join('\n');
}

export function senderVerificationOtpHtml(content: SenderVerificationOtpContent): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81,#4338ca);padding:24px 28px;">
              <p style="margin:0;font-size:12px;color:#c7d2fe;letter-spacing:0.08em;text-transform:uppercase;">Retail IMS</p>
              <h2 style="margin:4px 0 0;font-size:22px;color:#eef2ff;">Verify sender email</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 12px;font-size:14px;color:#1e293b;line-height:1.6;">
                Confirm <strong>${content.email}</strong> for <strong>${content.companyName}</strong>.
              </p>
              <p style="margin:0 0 8px;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#111827;">${content.otpCode}</p>
              <p style="margin:0;font-size:12px;color:#64748b;">Expires in ${content.expiresMinutes} minutes.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

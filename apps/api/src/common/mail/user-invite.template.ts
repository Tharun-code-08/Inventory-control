export type UserInviteEmailContent = {
  inviteUrl: string;
  companyName: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviterName: string;
  roleName: string;
  shopName?: string | null;
  expiresHours: number;
};

export function userInviteSubject(companyName: string): string {
  return `You're invited to ${companyName} on Retail IMS`;
}

export function userInviteText(content: UserInviteEmailContent): string {
  return [
    `Hello${content.inviteeName ? ` ${content.inviteeName}` : ''},`,
    '',
    `${content.inviterName} invited you to join ${content.companyName} on Retail IMS.`,
    `Role: ${content.roleName}${content.shopName ? ` ? ${content.shopName}` : ''}`,
    '',
    `Accept your invitation: ${content.inviteUrl}`,
    '',
    `This link expires in ${content.expiresHours} hours.`,
    '',
    'If you were not expecting this, you can ignore the email.',
    '',
    'Softdigit Consulting',
    'office@softdigitconsulting.com',
  ].join('\n');
}

export function userInviteHtml(content: UserInviteEmailContent): string {
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
              <h2 style="margin:4px 0 0;font-size:22px;color:#eef2ff;">You're invited</h2>
              <p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;">${content.companyName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 12px;font-size:16px;color:#0f172a;">
                Hello${content.inviteeName ? ` ${content.inviteeName}` : ''},
              </p>
              <p style="margin:0 0 12px;font-size:14px;color:#1e293b;line-height:1.6;">
                ${content.inviterName} invited you to join <strong>${content.companyName}</strong> on Retail IMS.
              </p>
              <p style="margin:0 0 12px;font-size:14px;color:#1e293b;line-height:1.6;">
                Role: <strong>${content.roleName}</strong>${content.shopName ? ` ? ${content.shopName}` : ''}<br/>
                Link expires in ${content.expiresHours} hours.
              </p>
              <p style="margin:16px 0;">
                <a href="${content.inviteUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">
                  Accept invitation
                </a>
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:#475569;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${content.inviteUrl}" style="color:#4338ca;text-decoration:none;word-break:break-all;">${content.inviteUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">If you weren't expecting this invitation, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

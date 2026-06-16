export type BusinessEmailLayoutContent = {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  brandLabel?: string;
  maxWidthPx?: number;
  /** Support address shown in the footer. Defaults to the office mailbox. */
  supportEmail?: string;
  /** Optional extra line in the footer (e.g. a legal/address line). */
  footerNote?: string;
};

const DEFAULT_SUPPORT_EMAIL = 'office@softdigitconsulting.com';

export function wrapBusinessEmailHtml(content: BusinessEmailLayoutContent): string {
  const brand = escapeHtml(content.brandLabel ?? 'SoftdigitIMS');
  const title = escapeHtml(content.title);
  const subtitle = content.subtitle ? `<p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;">${escapeHtml(content.subtitle)}</p>` : '';
  const maxWidthPx = Number.isFinite(content.maxWidthPx) ? Math.max(360, Math.floor(content.maxWidthPx as number)) : 520;
  const supportEmail = escapeHtml(content.supportEmail ?? DEFAULT_SUPPORT_EMAIL);
  const footerNote = content.footerNote ? `<p style="margin:0 0 6px;font-size:12px;color:#94a3b8;" class="email-muted">${escapeHtml(content.footerNote)}</p>` : '';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <style>
    @media (prefers-color-scheme: dark) {
      .email-bg { background: #0f172a !important; }
      .email-card { background: #1e293b !important; }
      .email-body-text { color: #cbd5e1 !important; }
      .email-muted { color: #94a3b8 !important; }
      .email-footer { background: #0b1220 !important; border-color: #1e293b !important; }
    }
    a.email-link { color: #4338ca; text-decoration: none; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;" class="email-bg">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;" class="email-bg">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:${maxWidthPx}px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);" class="email-card">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81,#4338ca);padding:24px 28px;">
              <p style="margin:0;font-size:12px;color:#c7d2fe;letter-spacing:0.08em;text-transform:uppercase;">${brand}</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">${title}</h1>
              ${subtitle}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;" class="email-body-text">
              ${content.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;" class="email-footer">
              ${footerNote}
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;" class="email-muted">
                Questions? Reach us at <a href="mailto:${supportEmail}" class="email-link" style="color:#4338ca;text-decoration:none;">${supportEmail}</a>.
              </p>
              <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;" class="email-muted">
                This is an automated message from your ${brand} workspace. Please do not reply directly to this email.
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;" class="email-muted">
                &copy; ${year} ${brand}. All rights reserved.
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

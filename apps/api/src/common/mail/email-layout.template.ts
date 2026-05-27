export type BusinessEmailLayoutContent = {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  brandLabel?: string;
  maxWidthPx?: number;
};

export function wrapBusinessEmailHtml(content: BusinessEmailLayoutContent): string {
  const brand = escapeHtml(content.brandLabel ?? 'Retail IMS');
  const title = escapeHtml(content.title);
  const subtitle = content.subtitle ? `<p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;">${escapeHtml(content.subtitle)}</p>` : '';
  const maxWidthPx = Number.isFinite(content.maxWidthPx) ? Math.max(360, Math.floor(content.maxWidthPx as number)) : 520;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:${maxWidthPx}px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81,#4338ca);padding:24px 28px;">
              <p style="margin:0;font-size:12px;color:#c7d2fe;letter-spacing:0.08em;text-transform:uppercase;">${brand}</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">${title}</h1>
              ${subtitle}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              ${content.bodyHtml}
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

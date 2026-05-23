export type SalesQuotationLine = {
  code: string;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  lineValue: string;
};

export type SalesQuotationEmailContent = {
  customerName: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string | null;
  shopName: string;
  remarks: string | null;
  lines: SalesQuotationLine[];
  totalValue: string;
  companyName: string;
  portalUrl?: string | null;
  isRevision?: boolean;
};

export function salesQuotationSubject(content: SalesQuotationEmailContent): string {
  return `Sales Quotation ${content.quoteNumber} — ${content.companyName}`;
}

export function salesQuotationText(content: SalesQuotationEmailContent): string {
  const lines = [
    `Dear ${content.customerName},`,
    '',
    `Please find below our quotation ${content.quoteNumber} dated ${content.quoteDate}.`,
    content.validUntil ? `Valid until: ${content.validUntil}` : '',
    content.shopName ? `Plant: ${content.shopName}` : '',
    '',
    'Line items:',
    ...content.lines.map(
      (l) =>
        `  • ${l.code} — ${l.description}: ${l.quantity} ${l.uom} @ ${l.unitPrice} = ${l.lineValue}`,
    ),
    '',
    `Grand total: ${content.totalValue}`,
    content.remarks ? `\nNotes:\n${content.remarks}` : '',
    '',
    content.portalUrl
      ? `Review and respond online:\n${content.portalUrl}\n`
      : '',
    'Thank you for your business.',
    content.companyName,
    'Retail IMS',
  ].filter(Boolean);
  return lines.join('\n');
}

export function salesQuotationHtml(content: SalesQuotationEmailContent): string {
  const lineRows = content.lines
    .map(
      (l, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 12px;font-size:13px;color:#334155;border-bottom:1px solid #e2e8f0;">
        <strong>${escapeHtml(l.code)}</strong><br/>
        <span style="color:#64748b;">${escapeHtml(l.description)}</span>
      </td>
      <td style="padding:10px 12px;font-size:13px;text-align:right;color:#334155;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.quantity)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.uom)}</td>
      <td style="padding:10px 12px;font-size:13px;text-align:right;color:#334155;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.unitPrice)}</td>
      <td style="padding:10px 12px;font-size:13px;text-align:right;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.lineValue)}</td>
    </tr>`,
    )
    .join('');

  const validRow = content.validUntil
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Valid until</td><td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(content.validUntil)}</td></tr>`
    : '';

  const remarksBlock = content.remarks
    ? `<p style="margin:20px 0 0;font-size:14px;color:#475569;line-height:1.5;"><strong>Notes:</strong><br/>${escapeHtml(content.remarks).replace(/\n/g, '<br/>')}</p>`
    : '';

  const portalBlock = content.portalUrl
    ? `<p style="margin:0 0 24px;text-align:center;">
        <a href="${escapeHtml(content.portalUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
          ${content.isRevision ? 'Review revised quotation' : 'Review &amp; respond to quotation'}
        </a>
      </p>
      <p style="margin:0 0 20px;text-align:center;font-size:13px;color:#64748b;">
        Accept the quote or submit your target price — no login required.
      </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#4338ca);padding:28px 32px;">
              <p style="margin:0;font-size:11px;color:#c7d2fe;letter-spacing:0.1em;text-transform:uppercase;">${escapeHtml(content.companyName)}</p>
              <h1 style="margin:10px 0 0;font-size:26px;color:#ffffff;font-weight:700;">Sales Quotation</h1>
              <p style="margin:8px 0 0;font-size:15px;color:#e0e7ff;">${escapeHtml(content.quoteNumber)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#334155;">Dear <strong>${escapeHtml(content.customerName)}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.55;">
                ${content.isRevision ? 'We have prepared a revised quotation based on your feedback. Please review the updated details below.' : 'Thank you for your interest. Please review the quotation details below.'}
              </p>
              ${portalBlock}
              <table width="100%" style="margin:0 0 24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr><td style="padding:14px 16px;">
                  <table width="100%">
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Quote date</td><td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(content.quoteDate)}</td></tr>
                    ${validRow}
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Plant</td><td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(content.shopName)}</td></tr>
                  </table>
                </td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#0f172a;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.05em;">Product</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#e2e8f0;text-transform:uppercase;">Qty</th>
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#e2e8f0;text-transform:uppercase;">UoM</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#e2e8f0;text-transform:uppercase;">Unit price</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#e2e8f0;text-transform:uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>${lineRows}</tbody>
                <tfoot>
                  <tr style="background:#f1f5f9;">
                    <td colspan="4" style="padding:14px 12px;text-align:right;font-size:14px;font-weight:600;color:#334155;">Grand total</td>
                    <td style="padding:14px 12px;text-align:right;font-size:16px;font-weight:700;color:#1e3a8a;">${escapeHtml(content.totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
              ${remarksBlock}
              <p style="margin:28px 0 0;font-size:14px;color:#475569;line-height:1.5;">
                ${content.portalUrl ? 'Use the button above to accept this quotation or request revised pricing.' : 'If you have any questions, please reply to this email.'}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">${escapeHtml(content.companyName)} · Retail IMS</p>
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

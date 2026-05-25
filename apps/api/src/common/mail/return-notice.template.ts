export type ReturnNoticeLine = {
  code: string;
  description: string;
  grnQuantity: string;
  returnQuantity: string;
  reason: string;
  imageCount: number;
};

export type ReturnNoticeEmailContent = {
  supplierName: string;
  returnNumber: string;
  returnDate: string;
  grNumber: string;
  shopName: string;
  companyName: string;
  supplierRef?: string | null;
  remarks?: string | null;
  acknowledgementUrl: string;
  lines: ReturnNoticeLine[];
};

export function returnNoticeSubject(content: ReturnNoticeEmailContent): string {
  return `Return Notice - ${content.returnNumber} | ${content.companyName}`;
}

export function returnNoticeText(content: ReturnNoticeEmailContent): string {
  const lines = [
    `Hello ${content.supplierName},`,
    '',
    `Please review return notice ${content.returnNumber} raised against goods receipt ${content.grNumber}.`,
    `Plant: ${content.shopName}`,
    `Date: ${content.returnDate}`,
    content.supplierRef ? `Supplier reference: ${content.supplierRef}` : null,
    '',
    'Returned items:',
    ...content.lines.map(
      (line) =>
        `- ${line.code} ${line.description ? `(${line.description}) ` : ''}| GRN Qty: ${line.grnQuantity} | Return Qty: ${line.returnQuantity} | Reason: ${line.reason} | Images: ${line.imageCount}`,
    ),
    '',
    `Acknowledge the return notice: ${content.acknowledgementUrl}`,
    content.remarks ? '' : null,
    content.remarks ? `Notes: ${content.remarks}` : null,
    '',
    'Thank you,',
    content.companyName,
  ].filter(Boolean);

  return lines.join('\n');
}

export function returnNoticeHtml(content: ReturnNoticeEmailContent): string {
  const rows = content.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${line.code}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${line.description}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${line.grnQuantity}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${line.returnQuantity}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${line.reason}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${line.imageCount}</td>
      </tr>
    `,
    )
    .join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${content.returnNumber}</title>
    </head>
    <body style="font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 4px;">Return Notice ${content.returnNumber}</h2>
      <p style="margin:0 0 12px;color:#475569;">${content.companyName}</p>
      <p style="margin:0 0 4px;">Plant: <strong>${content.shopName}</strong></p>
      <p style="margin:0 0 4px;">Goods receipt: <strong>${content.grNumber}</strong></p>
      <p style="margin:0 0 12px;">Date: <strong>${content.returnDate}</strong></p>
      ${
        content.supplierRef
          ? `<p style="margin:0 0 12px;">Supplier reference: <strong>${content.supplierRef}</strong></p>`
          : ''
      }
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin:12px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Code</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Description</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">GRN Qty</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Return Qty</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Reason</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">Images</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${
        content.remarks
          ? `<p style="margin:8px 0;font-size:13px;color:#475569;">Notes: ${content.remarks}</p>`
          : ''
      }
      <p style="margin:16px 0 10px;">
        Please acknowledge this return notice so we can complete the stock adjustment.
      </p>
      <p style="margin:0 0 16px;">
        <a
          href="${content.acknowledgementUrl}"
          style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;"
        >
          Acknowledge Return Notice
        </a>
      </p>
      <p style="margin:0;">Thank you,</p>
      <p style="margin:4px 0 0;">${content.companyName}</p>
    </body>
  </html>`;
}

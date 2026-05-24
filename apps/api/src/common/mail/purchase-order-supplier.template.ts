export type PurchaseOrderLine = {
  code: string;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  lineValue: string;
};

export type PurchaseOrderEmailContent = {
  supplierName: string;
  poNumber: string;
  poDate: string;
  shopName: string;
  remarks: string | null;
  totalValue: string;
  companyName: string;
  lines: PurchaseOrderLine[];
};

export function purchaseOrderSubject(content: PurchaseOrderEmailContent): string {
  return `Purchase Order ${content.poNumber} — ${content.companyName}`;
}

export function purchaseOrderText(content: PurchaseOrderEmailContent): string {
  const lines = [
    `Hello ${content.supplierName},`,
    '',
    `Please find our purchase order ${content.poNumber} dated ${content.poDate} attached as a PDF.`,
    `Plant: ${content.shopName}`,
    '',
    'A summary of line items is included below for your reference.',
    '',
  ];
  content.lines.forEach((line) => {
    lines.push(`• ${line.code} — ${line.description} — ${line.quantity} ${line.uom} @ ${line.unitPrice}`);
  });
  lines.push('', `Total: ${content.totalValue}`);
  if (content.remarks) lines.push('', `Notes: ${content.remarks}`);
  lines.push('', 'Thank you,', content.companyName);
  return lines.join('\n');
}

export function purchaseOrderHtml(content: PurchaseOrderEmailContent): string {
  const rows = content.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${line.code}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${line.description}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${line.quantity}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${line.uom}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${line.unitPrice}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${line.lineValue}</td>
      </tr>
    `,
    )
    .join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Purchase Order ${content.poNumber}</title>
    </head>
    <body style="font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 4px;">Purchase Order ${content.poNumber}</h2>
      <p style="margin:0 0 12px;color:#475569;">${content.companyName}</p>
      <p style="margin:0 0 8px;">Date: <strong>${content.poDate}</strong> &nbsp; | &nbsp; Plant: <strong>${content.shopName}</strong></p>
      <p style="margin:0 0 12px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:14px;color:#166534;">
        The official purchase order PDF (<strong>${content.poNumber}.pdf</strong>) is attached to this email.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin:12px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Code</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Description</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Qty</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">UOM</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Rate</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Value</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:8px 0;font-size:14px;color:#0f172a;"><strong>Total:</strong> ${content.totalValue}</p>
      ${content.remarks ? `<p style="margin:8px 0;font-size:13px;color:#475569;">Notes: ${content.remarks}</p>` : ''}
      <p style="margin:16px 0 4px;">Thank you,</p>
      <p style="margin:0;">${content.companyName}</p>
    </body>
  </html>`;
}

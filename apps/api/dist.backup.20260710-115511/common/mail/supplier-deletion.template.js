"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierDeletionSubject = supplierDeletionSubject;
exports.supplierDeletionText = supplierDeletionText;
exports.supplierDeletionHtml = supplierDeletionHtml;
function supplierDeletionSubject(supplierName) {
    return `Confirm supplier deletion: ${supplierName}`;
}
function supplierDeletionText(content) {
    return [
        'Supplier deletion requires your confirmation.',
        '',
        `Supplier: ${content.supplierName} (${content.supplierCode})`,
        `Requested by: ${content.requestedByName}`,
        '',
        'Linked records (will remain in history after deletion):',
        `  RFQ invitations: ${content.rfqCount}`,
        `  Supplier quotations: ${content.quotationCount}`,
        `  Contracts: ${content.contractCount}`,
        `  Purchase orders (by name): ${content.purchaseOrderCount}`,
        '',
        'Confirm deletion:',
        content.confirmUrl,
        '',
        'This link expires in 48 hours.',
    ].join('\n');
}
function supplierDeletionHtml(content) {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:#b91c1c;padding:20px 24px;">
          <p style="margin:0;font-size:12px;color:#fecaca;text-transform:uppercase;">SoftdigitIMS</p>
          <h1 style="margin:8px 0 0;font-size:20px;color:#fff;">Confirm supplier deletion</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 12px;color:#334155;"><strong>${esc(content.supplierName)}</strong> (${esc(content.supplierCode)})</p>
          <p style="margin:0 0 16px;color:#64748b;font-size:14px;">Requested by ${esc(content.requestedByName)}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#475569;">Historical RFQs, quotations, contracts, and POs stay in the system; the supplier will be removed from active lists.</p>
          <table width="100%" style="margin:16px 0;background:#f8fafc;border-radius:8px;font-size:13px;">
            <tr><td style="padding:8px 12px;">RFQ invitations</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${content.rfqCount}</td></tr>
            <tr><td style="padding:8px 12px;">Quotations</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${content.quotationCount}</td></tr>
            <tr><td style="padding:8px 12px;">Contracts</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${content.contractCount}</td></tr>
            <tr><td style="padding:8px 12px;">Purchase orders</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${content.purchaseOrderCount}</td></tr>
          </table>
          <p style="text-align:center;margin:20px 0;">
            <a href="${esc(content.confirmUrl)}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Confirm deletion</a>
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">${esc(content.confirmUrl)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
function esc(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
//# sourceMappingURL=supplier-deletion.template.js.map
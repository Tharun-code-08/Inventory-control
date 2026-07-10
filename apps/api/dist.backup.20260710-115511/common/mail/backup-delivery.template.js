"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupDeliverySubject = backupDeliverySubject;
exports.backupDeliveryText = backupDeliveryText;
exports.backupDeliveryHtml = backupDeliveryHtml;
function backupDeliverySubject(params) {
    const code = params.companyCode ? ` (${params.companyCode})` : '';
    return `SoftdigitIMS Backup${code}`;
}
function backupDeliveryText(params) {
    return [
        'A new company backup is attached.',
        params.companyCode ? `Company: ${params.companyCode}` : null,
        `File: ${params.fileName} (~${params.approxSizeKb} KB)`,
        '',
        'If you did not request this backup, rotate credentials and audit access immediately.',
    ]
        .filter(Boolean)
        .join('\n');
}
function backupDeliveryHtml(params) {
    return `
    <p>A new company backup is attached.</p>
    <ul>
      ${params.companyCode ? `<li><strong>Company:</strong> ${params.companyCode}</li>` : ''}
      <li><strong>File:</strong> ${params.fileName} (~${params.approxSizeKb} KB)</li>
    </ul>
    <p style="color:#b91c1c;"><strong>Security note:</strong> If you did not request this backup, rotate credentials and audit access immediately.</p>
  `;
}
//# sourceMappingURL=backup-delivery.template.js.map
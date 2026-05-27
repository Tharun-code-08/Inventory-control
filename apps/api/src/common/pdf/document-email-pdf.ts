import { renderHtmlToPdfBuffer } from './html-to-pdf.service';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type SimpleDocumentPdfData = {
  title: string;
  documentNumber: string;
  documentDate?: string;
  partyLabel: string;
  partyName: string;
  companyName: string;
  summaryLines?: Array<{ label: string; value: string }>;
  tableHeaders?: string[];
  tableRows?: string[][];
  footerNote?: string;
};

export function buildSimpleDocumentPrintHtml(data: SimpleDocumentPdfData): string {
  const summary = (data.summaryLines ?? [])
    .map(
      (row) =>
        `<tr><td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:600;width:35%;">${escapeHtml(row.label)}</td><td style="padding:6px 8px;border:1px solid #cbd5e1;">${escapeHtml(row.value)}</td></tr>`,
    )
    .join('');
  const table =
    data.tableHeaders && data.tableRows
      ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead><tr>${data.tableHeaders.map((h) => `<th style="padding:6px 8px;border:1px solid #94a3b8;background:#e2e8f0;text-align:left;">${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${data.tableRows.map((cells) => `<tr>${cells.map((c) => `<td style="padding:6px 8px;border:1px solid #cbd5e1;">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`
      : '';

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(data.documentNumber)}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#0f172a;">
  <h1 style="margin:0 0 4px;color:#312e81;">${escapeHtml(data.title)}</h1>
  <p style="margin:0 0 16px;color:#475569;">${escapeHtml(data.companyName)}</p>
  <table style="width:100%;border-collapse:collapse;">${summary}</table>
  ${table}
  ${data.footerNote ? `<p style="margin-top:16px;font-size:12px;color:#64748b;">${escapeHtml(data.footerNote)}</p>` : ''}
</body></html>`;
}

export async function renderSimpleDocumentPdf(data: SimpleDocumentPdfData): Promise<Buffer> {
  return renderHtmlToPdfBuffer(buildSimpleDocumentPrintHtml(data));
}

export function documentPdfFilename(prefix: string, number: string): string {
  const safe = number.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_') || prefix;
  return `${safe}.pdf`;
}

export async function tryRenderDocumentPdfAttachment(
  data: SimpleDocumentPdfData,
  filePrefix: string,
): Promise<Array<{ filename: string; content: Buffer }> | undefined> {
  try {
    const content = await renderSimpleDocumentPdf(data);
    return [{ filename: documentPdfFilename(filePrefix, data.documentNumber), content }];
  } catch {
    return undefined;
  }
}

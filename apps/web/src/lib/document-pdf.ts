import { api } from '@/api/client';

export type DocumentPdfKind =
  | 'purchase-order'
  | 'goods-receipt'
  | 'goods-return'
  | 'supplier-bill'
  | 'supplier-payment'
  | 'sales-quotation'
  | 'sales-order'
  | 'goods-issue'
  | 'invoice'
  | 'payment';

function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] ?? fallback;
}

/** Download a document PDF from the unified API and trigger a browser save. */
export async function downloadDocumentPdf(kind: DocumentPdfKind, id: string): Promise<void> {
  const response = await api.get(`/documents/${kind}/${id}/pdf`, {
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  const filename = parseFilename(
    response.headers['content-disposition'] as string | undefined,
    `${kind}-${id}.pdf`,
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Legacy alias — purchase orders use the unified documents endpoint. */
export async function downloadPurchaseOrderPdfById(poId: string): Promise<void> {
  return downloadDocumentPdf('purchase-order', poId);
}

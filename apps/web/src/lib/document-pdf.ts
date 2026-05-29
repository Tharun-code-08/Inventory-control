import { api } from '@/api/client';
import { getApiErrorMessage, readApiErrorFromBlob } from '@/lib/api-error';

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

async function isPdfBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 100) return false;
  const header = await blob.slice(0, 4).text();
  return header === '%PDF';
}

async function rejectIfErrorBlob(blob: Blob, status?: number): Promise<void> {
  const contentType = blob.type.toLowerCase();
  if (
    contentType.includes('json') ||
    contentType.includes('text/html') ||
    contentType.includes('text/plain')
  ) {
    throw new Error(await readApiErrorFromBlob(blob, status, 'Could not generate PDF'));
  }
  if (!(await isPdfBlob(blob))) {
    throw new Error(await readApiErrorFromBlob(blob, status, 'Could not generate PDF'));
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Download a document PDF from the unified API and trigger a browser save. */
export async function downloadDocumentPdf(kind: DocumentPdfKind, id: string): Promise<void> {
  try {
    const response = await api.get(`/documents/${kind}/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = response.data as Blob;
    await rejectIfErrorBlob(blob, response.status);

    const filename = parseFilename(
      response.headers['content-disposition'] as string | undefined,
      `${kind}-${id}.pdf`,
    );
    triggerDownload(blob, filename);
  } catch (err: unknown) {
    if (err instanceof Error && !('response' in err)) {
      throw err;
    }
    const response = (err as { response?: { data?: unknown; status?: number } })?.response;
    if (response?.data instanceof Blob) {
      throw new Error(
        await readApiErrorFromBlob(response.data, response.status, 'Could not generate PDF'),
      );
    }
    throw new Error(getApiErrorMessage(err, 'Could not generate PDF'));
  }
}

/** Legacy alias — purchase orders use the unified documents endpoint. */
export async function downloadPurchaseOrderPdfById(poId: string): Promise<void> {
  return downloadDocumentPdf('purchase-order', poId);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null): boolean {
  if (!value?.trim()) return false;
  return UUID_PATTERN.test(value.trim());
}

export function displayDocumentNumber(value?: string | null, fallback = '—'): string {
  const trimmed = value?.trim();
  if (!trimmed || isUuid(trimmed)) return fallback;
  return trimmed;
}

export function formatGrOption(gr: { grNumber?: string | null; supplierName?: string | null }): string {
  const number = displayDocumentNumber(gr.grNumber, 'GR');
  const supplier = gr.supplierName?.trim();
  return supplier ? `${number} — ${supplier}` : number;
}

export function formatPoOption(po: { poNumber?: string | null; supplier?: string | null }): string {
  const number = displayDocumentNumber(po.poNumber, 'PO');
  const supplier = po.supplier?.trim();
  return supplier ? `${number} — ${supplier}` : number;
}

export function formatBillOption(bill: {
  billNumber?: string | null;
  supplier?: { supplierName?: string | null } | null;
}): string {
  const number = displayDocumentNumber(bill.billNumber, 'Bill');
  const supplier = bill.supplier?.supplierName?.trim();
  return supplier ? `${number} — ${supplier}` : number;
}

export function formatInvoiceOption(invoice: {
  invoiceNumber?: string | null;
  customer?: { customerName?: string | null } | null;
}): string {
  const number = displayDocumentNumber(invoice.invoiceNumber, 'Invoice');
  const customer = invoice.customer?.customerName?.trim();
  return customer ? `${number} — ${customer}` : number;
}

export function formatCustomerOption(customer: {
  customerCode?: string | null;
  customerName?: string | null;
}): string {
  const code = displayDocumentNumber(customer.customerCode, '');
  const name = customer.customerName?.trim() || 'Customer';
  return code ? `${code} — ${name}` : name;
}

export function formatSalesOrderOption(so: { soNumber?: string | null }): string {
  return displayDocumentNumber(so.soNumber, 'SO');
}

export function formatSupplierReference(
  supplier?: { supplierCode?: string | null; supplierName?: string | null } | null,
): string {
  const name = supplier?.supplierName?.trim();
  const code = displayDocumentNumber(supplier?.supplierCode, '');
  if (name && code) return `${code} — ${name}`;
  if (name) return name;
  if (code) return code;
  return '—';
}

export const DOCUMENT_SELECT_NONE = '__none__';

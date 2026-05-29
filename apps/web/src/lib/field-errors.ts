import { getApiErrorMessage } from '@/lib/api-error';

const FIELD_ALIASES: Record<string, string[]> = {
  customerName: ['customername', 'customer name', 'name'],
  email: ['email'],
  phone: ['phone'],
  taxId: ['taxid', 'gstin', 'tax id', 'gst'],
  pan: ['pan'],
  postalCode: ['postalcode', 'postal code', 'pincode', 'zip'],
  city: ['city'],
  state: ['state'],
  shopId: ['shopid', 'shop', 'plant'],
  productName: ['productname', 'product name'],
  productCode: ['productcode', 'product code', 'sku'],
  supplierName: ['suppliername', 'supplier name'],
  unitPrice: ['unitprice', 'unit price', 'price'],
};

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fieldFromMessage(message: string): string | null {
  const lower = message.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (lower.startsWith(alias) || lower.includes(`${alias} `) || lower.includes(`${alias}.`)) {
        return field;
      }
    }
  }
  const firstWord = lower.split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '');
  if (firstWord) {
    for (const [field] of Object.entries(FIELD_ALIASES)) {
      if (normalizeKey(field) === firstWord) return field;
    }
  }
  return null;
}

function extractMessages(err: unknown): string[] {
  const response = (err as { response?: { data?: unknown } })?.response;
  const data = response?.data;
  if (!data || typeof data !== 'object') return [];

  const payload = data as Record<string, unknown>;
  const nested = payload.error;
  if (nested && typeof nested === 'object' && nested !== null) {
    const msg = (nested as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg.filter((m): m is string => typeof m === 'string');
    if (typeof msg === 'string' && msg.trim()) return [msg.trim()];
  }

  const top = payload.message;
  if (Array.isArray(top)) return top.filter((m): m is string => typeof m === 'string');
  if (typeof top === 'string' && top.trim()) return [top.trim()];

  return [];
}

/** Map API validation errors to form field keys when possible. */
export function parseApiFieldErrors(err: unknown): Record<string, string> {
  const messages = extractMessages(err);
  const result: Record<string, string> = {};

  for (const message of messages) {
    const field = fieldFromMessage(message);
    if (field && !result[field]) {
      result[field] = message;
    }
  }

  if (Object.keys(result).length === 0) {
    const fallback = getApiErrorMessage(err, '');
    if (fallback) result._form = fallback;
  }

  return result;
}

export function formErrorMessage(fieldErrors: Record<string, string>): string {
  return fieldErrors._form ?? Object.values(fieldErrors)[0] ?? 'Something went wrong. Please try again.';
}

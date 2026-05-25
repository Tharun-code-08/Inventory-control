import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';

export function exportModuleCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): boolean {
  if (rows.length === 0) return false;
  downloadCsv(filename, toCsv(rows, columns));
  return true;
}

export function csvDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function csvDateTime(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function csvMoney(value?: string | number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '';
  return amount.toFixed(2);
}

export function csvList(values: Array<string | null | undefined>, separator = '; '): string {
  return values.map((value) => value?.trim()).filter(Boolean).join(separator);
}

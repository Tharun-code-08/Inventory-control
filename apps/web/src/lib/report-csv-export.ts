import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';

export function exportReportCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): boolean {
  if (rows.length === 0) return false;
  downloadCsv(filename, toCsv(rows, columns));
  return true;
}

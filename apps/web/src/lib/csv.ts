/**
 * Minimal RFC4180-ish CSV helpers for in-browser inventory import/export.
 * Avoids pulling in heavier parsers when we just need round-trippable text.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((col) => escapeCell(col.header)).join(',');
  const body = rows
    .map((row) => columns.map((col) => escapeCell(col.value(row))).join(','))
    .join('\r\n');
  return body ? `${header}\r\n${body}` : header;
}

export function downloadCsv(filename: string, csv: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse CSV text. The first non-empty row is treated as a header.
 * Returns an array of records keyed by header (whitespace-trimmed, BOM-stripped).
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const cells = tokenize(text);
  if (cells.length === 0) return [];
  const [headerRow, ...rows] = cells;
  const headers = headerRow.map((h) => h.replace(/^\uFEFF/, '').trim());
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = (row[idx] ?? '').trim();
      });
      return record;
    });
}

function tokenize(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\r') {
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      result.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    result.push(row);
  }
  return result;
}

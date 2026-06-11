const MAX_BARCODE_LENGTH = 255;

// Control characters are matched intentionally: scanners emit them as framing.
const CONTROL_AND_ZERO_WIDTH = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\u0000-\\u001f\\u007f\\u200b-\\u200d\\ufeff]',
  'g',
);

/**
 * Normalize raw scanner input: Unicode NFKC fold, strip control/zero-width
 * characters, trim surrounding whitespace. Returns null when the scan is
 * empty or oversized after cleaning — callers treat that as an invalid scan.
 */
export function normalizeBarcode(raw: string): string | null {
  const cleaned = raw.normalize('NFKC').replace(CONTROL_AND_ZERO_WIDTH, '').trim();
  if (cleaned.length === 0 || cleaned.length > MAX_BARCODE_LENGTH) {
    return null;
  }
  return cleaned;
}

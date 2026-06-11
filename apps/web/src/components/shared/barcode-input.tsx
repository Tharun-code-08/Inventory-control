import { forwardRef, useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const MAX_BARCODE_LENGTH = 255;
const DUPLICATE_SCAN_WINDOW_MS = 800;
const CONTROL_AND_ZERO_WIDTH = new RegExp('[\u0000-\u001f\u007f\u200b-\u200d\ufeff]', 'g');

/** Mirror of the server-side normalizer: NFKC fold, strip control/zero-width chars, trim. */
export function normalizeBarcode(raw: string): string | null {
  const cleaned = raw.normalize('NFKC').replace(CONTROL_AND_ZERO_WIDTH, '').trim();
  if (cleaned.length === 0 || cleaned.length > MAX_BARCODE_LENGTH) return null;
  return cleaned;
}

type BarcodeInputProps = {
  /** Called with the normalized barcode when a scan completes (Enter pressed). */
  onScan: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Re-fire onScan for back-to-back identical scans (bulk count mode). Default false. */
  allowRepeatScans?: boolean;
};

/**
 * Single reusable scanner field for goods receipt/issue, sales, purchases,
 * stock counts, and transfers. Handles both hardware scanners (which send the
 * code followed by Enter) and manual typing — submission is Enter-driven, not
 * typing-speed heuristics. The field clears itself after each scan so users
 * can keep scanning without touching the page.
 */
export const BarcodeInput = forwardRef<HTMLInputElement, BarcodeInputProps>(function BarcodeInput(
  { onScan, placeholder = 'Scan or type a barcode…', className, disabled, autoFocus = true, allowRepeatScans = false },
  ref,
) {
  const [value, setValue] = useState('');
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const submit = useCallback(() => {
    const code = normalizeBarcode(value);
    setValue('');
    if (!code) return;
    // Hardware scanners can double-fire; swallow the immediate duplicate
    // unless the caller explicitly wants repeats (e.g. bulk counting).
    const now = Date.now();
    if (
      !allowRepeatScans &&
      lastScan.current &&
      lastScan.current.code === code &&
      now - lastScan.current.at < DUPLICATE_SCAN_WINDOW_MS
    ) {
      return;
    }
    lastScan.current = { code, at: now };
    onScan(code);
  }, [value, onScan, allowRepeatScans]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={cn('group relative', className)}>
      <ScanBarcode
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        aria-label="Barcode scanner input"
        className="pl-9"
      />
    </div>
  );
});

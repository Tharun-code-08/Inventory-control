import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Printer,
  Plus,
  Minus,
  Barcode,
  CheckSquare,
  Square,
  ChevronDown,
  Package,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useProducts, useProduct } from '@/hooks/use-products';
import type { Product } from '@/hooks/use-products';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';

// ─── Label size presets (matching mobile/A4 specs) ───────────────────────────
const LABEL_SIZES = {
  small: { label: 'Small (50×25mm, 40/page)', w: 50, h: 25, cols: 4, rows: 10, font: 8 },
  medium: { label: 'Medium (65×35mm, 24/page)', w: 65, h: 35, cols: 3, rows: 8, font: 10 },
  large: { label: 'Large (100×60mm, 8/page)', w: 100, h: 60, cols: 2, rows: 4, font: 12 },
} as const;

type LabelSizeKey = keyof typeof LABEL_SIZES;

interface QueueItem {
  product: Product;
  qty: number;
}

interface LabelOptions {
  size: LabelSizeKey;
  showName: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  showSku: boolean;
}

// ─── Barcode drawing (Code-128 subset B via canvas) ───────────────────────────
const CODE128_CHARS: Record<string, number> = {};
(function () {
  const chars =
    ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
  chars.split('').forEach((c, i) => {
    CODE128_CHARS[c] = i + 32;
  });
})();

const CODE128_TABLE: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2],
  [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2],
  [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2],
  [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1],
  [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1],
  [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], [2, 2, 1, 2, 3, 1],
  [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1],
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1],
  [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1],
  [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1],
  [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1],
  [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1],
  [2, 1, 1, 3, 1, 3], [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1],
  [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1],
  [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1],
  [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1],
  [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1],
  [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1],
  [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1],
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1],
  [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4],
  [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1],
  [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4],
  [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1],
  [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1],
  [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], [1, 1, 1, 2, 4, 2],
  [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2],
  [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2],
  [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1],
  [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3],
  [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3],
  [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1],
  [1, 1, 3, 1, 4, 1], [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1],
  [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4],
  [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2],
];

function encodeCode128(text: string): number[] {
  const START_B = 104;
  const STOP = 106;
  const codes: number[] = [START_B];
  let checksum = START_B;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32;
    codes.push(charCode);
    checksum += charCode * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);
  return codes;
}

function drawBarcode(
  canvas: HTMLCanvasElement,
  text: string,
  opts: { width: number; height: number; showText?: boolean }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = 2; // high definition quality
  const textAreaH = opts.showText ? 14 : 0;
  const barAreaH = opts.height - textAreaH;

  canvas.width = opts.width * dpr;
  canvas.height = opts.height * dpr;
  canvas.style.width = `${opts.width}px`;
  canvas.style.height = `${opts.height}px`;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, opts.width, opts.height);

  const codes = encodeCode128(text);
  const bars: number[] = [];
  for (const code of codes) {
    const pattern = CODE128_TABLE[code];
    if (pattern) bars.push(...pattern);
  }

  const totalUnits = bars.reduce((a, b) => a + b, 0);
  const unitW = (opts.width - 12) / totalUnits;
  let x = 6;
  ctx.fillStyle = '#000000';
  bars.forEach((units, idx) => {
    const w = units * unitW;
    if (idx % 2 === 0) {
      ctx.fillRect(Math.round(x), 2, Math.max(1, Math.round(w)), barAreaH - 4);
    }
    x += w;
  });

  if (opts.showText) {
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.min(10, textAreaH - 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, opts.width / 2, opts.height - 2);
  }
}

function generateBarcodeDataUrl(text: string): string {
  const canvas = document.createElement('canvas');
  drawBarcode(canvas, text, { width: 180, height: 45, showText: false });
  return canvas.toDataURL('image/png');
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Single preview label component ──────────────────────────────────────────
function PreviewBarcodeLabel({
  product,
  options,
}: {
  product: Product;
  options: LabelOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = LABEL_SIZES[options.size];

  // Scale factor to translate mm to preview pixels
  const scale = 2.4;
  const pw = Math.round(size.w * scale);
  const ph = Math.round(size.h * scale);

  useEffect(() => {
    if (!canvasRef.current || !options.showBarcode) return;
    const nameHeightPx = options.showName ? (size.font * 1.4) : 0;
    const priceHeightPx = options.showPrice ? ((size.font + 1) * 1.2) : 0;
    const skuHeightPx = (options.showSku && !options.showBarcode) ? (size.font) : 0;
    const paddingPx = 4 * scale;
    const barHeightPx = ph - nameHeightPx - priceHeightPx - skuHeightPx - paddingPx;

    drawBarcode(canvasRef.current, product.productCode, {
      width: pw - 10,
      height: Math.max(32, Math.round(barHeightPx)),
      showText: true,
    });
  }, [product.productCode, pw, ph, options, size]);

  return (
    <div
      className="flex flex-col items-center justify-center text-center p-1 bg-white border border-dashed border-slate-300 overflow-hidden box-border select-none"
      style={{ width: pw, height: ph }}
    >
      {options.showName && (
        <p
          className="truncate font-semibold leading-none text-slate-800 w-full"
          style={{ fontSize: size.font - 0.5 }}
          title={product.description}
        >
          {product.description}
        </p>
      )}

      {options.showBarcode ? (
        <div className="flex items-center justify-center overflow-hidden my-0.5">
          <canvas ref={canvasRef} />
        </div>
      ) : null}

      {options.showSku && !options.showBarcode && (
        <p className="text-slate-500 font-mono" style={{ fontSize: size.font - 1.5 }}>
          {product.productCode}
        </p>
      )}

      {options.showPrice && (
        <p className="font-bold text-slate-900" style={{ fontSize: size.font }}>
          ₹{Number(product.sellingPrice).toFixed(2)}
        </p>
      )}
    </div>
  );
}

// ─── Product search selector dropdown ────────────────────────────────────────
function ProductSelector({ onAdd }: { onAdd: (product: Product) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = useProducts({ search, limit: 15, isActive: true });
  const products = data?.items ?? [];

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="barcode-product-search"
          className="pl-9 pr-9"
          placeholder="Search products by name or code…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close dropdown"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {products.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {search ? 'No products found' : 'Start typing to search…'}
              </div>
            ) : (
              products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50"
                  onClick={() => {
                    onAdd(p);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Package className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{p.description}</p>
                    <p className="text-xs text-slate-500">{p.productCode} · {p.category}</p>
                  </div>
                  <Plus className="ml-auto h-4 w-4 shrink-0 text-primary" />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function BarcodePrintPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [options, setOptions] = useState<LabelOptions>({
    size: 'medium',
    showName: true,
    showBarcode: true,
    showPrice: true,
    showSku: false,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const searchProductId = searchParams.get('productId');
  const { data: routeProduct } = useProduct(searchProductId ?? '');

  useEffect(() => {
    if (routeProduct) {
      setQueue((prev) => {
        const existing = prev.find((q) => q.product.id === routeProduct.id);
        if (existing) return prev;
        return [...prev, { product: routeProduct, qty: 1 }];
      });
      const next = new URLSearchParams(searchParams);
      next.delete('productId');
      setSearchParams(next, { replace: true });
    }
  }, [routeProduct, searchParams, setSearchParams]);

  const addProduct = useCallback((product: Product) => {
    setQueue((prev) => {
      const existing = prev.find((q) => q.product.id === product.id);
      if (existing) {
        return prev.map((q) => (q.product.id === product.id ? { ...q, qty: q.qty + 1 } : q));
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const removeItem = (productId: string) => {
    setQueue((prev) => prev.filter((q) => q.product.id !== productId));
  };

  const changeQty = (productId: string, delta: number) => {
    setQueue((prev) =>
      prev.map((q) => (q.product.id === productId ? { ...q, qty: Math.max(1, q.qty + delta) } : q))
    );
  };

  const totalLabels = queue.reduce((s, q) => s + q.qty, 0);
  const size = LABEL_SIZES[options.size];
  const perPage = size.cols * size.rows;
  const pagesCount = Math.max(1, Math.ceil(totalLabels / perPage));

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const cells: string[] = [];
    queue.forEach(({ product, qty }) => {
      const barcodeDataUrl = options.showBarcode ? generateBarcodeDataUrl(product.productCode) : undefined;

      const parts: string[] = [];
      if (options.showName) {
        parts.push(
          `<div style="font-size:${size.font}px;font-weight:600;line-height:1.2;overflow:hidden;max-height:${size.font * 2.4}px;margin-bottom:1mm;">${escapeHtml(product.description)}</div>`
        );
      }
      if (options.showBarcode && barcodeDataUrl) {
        parts.push(
          `<img src="${barcodeDataUrl}" style="width:92%;max-height:${Math.round(size.h * 0.45)}mm;object-fit:contain;margin-bottom:1mm;"/>`
        );
      }
      if (options.showSku && !options.showBarcode) {
        parts.push(`<div style="font-size:${size.font - 1.5}px;margin-bottom:1mm;font-family:monospace;">${escapeHtml(product.productCode)}</div>`);
      }
      if (options.showPrice) {
        parts.push(
          `<div style="font-size:${size.font + 1}px;font-weight:700;">₹${Number(product.sellingPrice).toFixed(2)}</div>`
        );
      }

      const cell = `<div class="label">${parts.join('')}</div>`;
      for (let i = 0; i < qty; i++) {
        cells.push(cell);
      }
    });

    // Page margin calculation to perfectly center on A4 (210mm x 297mm)
    const marginTopBottom = (297 - size.h * size.rows) / 2;
    const marginLeftRight = (210 - size.w * size.cols) / 2;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Barcode Label Sheet</title>
  <style>
    @page { 
      size: A4; 
      margin: ${marginTopBottom}mm ${marginLeftRight}mm; 
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; background: #fff; }
    .sheet { 
      display: flex; 
      flex-wrap: wrap; 
      width: ${size.w * size.cols}mm; 
    }
    .label {
      width: ${size.w}mm;
      height: ${size.h}mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 1.5mm;
      border: 0.15mm dashed #bbb;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="sheet">${cells.join('')}</div>
  <script>
    window.onload = () => { 
      window.print(); 
      window.onafterprint = () => window.close(); 
    }
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  // Preview only the first page cells
  const previewCells = useMemo(() => {
    const list: Product[] = [];
    outer: for (const entry of queue) {
      for (let i = 0; i < entry.qty; i++) {
        if (list.length >= perPage) break outer;
        list.push(entry.product);
      }
    }
    return list;
  }, [queue, perPage]);

  // Width/Height for visual A4 frame in preview: 210mm x 297mm scaled
  const frameScale = 1.6;
  const a4Width = Math.round(210 * frameScale);
  const a4Height = Math.round(297 * frameScale);

  return (
    <AppLayout active="Print Labels">
      <div className="space-y-6">
        <PageHeader
          title="Print Barcode Labels"
          description="Build and layout product barcode labels onto A4 sheets with direct print layout templates."
        >
          <Button
            id="barcode-print-btn"
            disabled={queue.length === 0}
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print {totalLabels > 0 ? `(${totalLabels})` : ''}
          </Button>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* ── Left Sidebar Settings & Queue ── */}
          <div className="space-y-5">
            {/* Search & Add */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Barcode className="h-4 w-4 text-primary" />
                  Add Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProductSelector onAdd={addProduct} />
              </CardContent>
            </Card>

            {/* Queue List */}
            {queue.length > 0 && (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">
                    Print Queue ({queue.length})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                    onClick={() => setQueue([])}
                  >
                    Clear All
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {queue.map(({ product, qty }) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{product.description}</p>
                        <p className="text-[10px] text-slate-400">{product.productCode}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="rounded border border-slate-300 p-0.5 hover:bg-slate-200 bg-white"
                          onClick={() => changeQty(product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{qty}</span>
                        <button
                          type="button"
                          className="rounded border border-slate-300 p-0.5 hover:bg-slate-200 bg-white"
                          onClick={() => changeQty(product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 shrink-0"
                        onClick={() => removeItem(product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Template options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sheet & Label Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preset sizes */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Label Layout Size</Label>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(LABEL_SIZES) as LabelSizeKey[]).map((key) => {
                      const item = LABEL_SIZES[key];
                      const active = options.size === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setOptions((o) => ({ ...o, size: key }))}
                          className={cn(
                            'flex flex-col items-start rounded-lg border p-3 text-left transition-colors relative overflow-hidden',
                            active
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <span className="text-xs font-semibold text-slate-900 capitalize flex items-center justify-between w-full">
                            {key} Template
                            {active && <CheckSquare className="h-3.5 w-3.5 text-primary" />}
                          </span>
                          <span className="mt-0.5 text-[10px] text-slate-500 leading-normal">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Visible Columns</Label>
                  <div className="space-y-1.5">
                    {(
                      [
                        ['showName', 'Product Description'],
                        ['showBarcode', 'Barcode Pattern'],
                        ['showPrice', 'Price Value'],
                        ['showSku', 'Product Code (Alternative)'],
                      ] as const
                    ).map(([key, label]) => {
                      const isChecked = options[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white hover:bg-slate-50 transition-colors"
                          onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info status */}
                {queue.length > 0 && (
                  <div className="rounded-lg bg-slate-50 border border-slate-150 p-3 text-xs space-y-1 text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-700">Sheet Print Summary</p>
                    <p>Total Labels: <strong>{totalLabels}</strong></p>
                    <p>Labels per A4 Page: <strong>{perPage}</strong></p>
                    <p>Requires: <strong>{pagesCount} A4 Page{pagesCount !== 1 ? 's' : ''}</strong></p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right A4 Live Preview Frame ── */}
          <Card className="min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm">Live Print Sheet Preview</CardTitle>
                <CardDescription className="text-xs">
                  Showing first page grid ({size.cols} × {size.rows}) scaled inside standard A4 sheet aspect ratios.
                </CardDescription>
              </div>
              {queue.length > 0 && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  Ready to print
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6 flex-1 flex items-center justify-center bg-slate-100">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 text-slate-400 py-12">
                  <Barcode className="h-16 w-16 opacity-25" />
                  <div className="text-center">
                    <p className="font-semibold text-slate-700">No print items queued</p>
                    <p className="text-xs">Search for products on the left panel to begin layout rendering.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {/* Page indicator */}
                  <MutedText>Page 1 of {pagesCount}</MutedText>

                  {/* Rendered A4 sheet mockup */}
                  <div
                    className="bg-white shadow-2xl border border-slate-300 box-border flex flex-wrap content-start overflow-hidden relative"
                    style={{
                      width: a4Width,
                      height: a4Height,
                      padding: `${(297 - size.h * size.rows) / 2 * frameScale}px ${(210 - size.w * size.cols) / 2 * frameScale}px`,
                    }}
                  >
                    {previewCells.map((product, idx) => (
                      <PreviewBarcodeLabel
                        key={`${product.id}-${idx}`}
                        product={product}
                        options={options}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function MutedText({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{children}</span>;
}

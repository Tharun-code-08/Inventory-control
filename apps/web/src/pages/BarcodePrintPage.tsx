import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  Printer,
  Plus,
  Minus,
  X,
  Barcode,
  CheckSquare,
  Square,
  ChevronDown,
  Package,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProducts, useProduct } from '@/hooks/use-products';
import type { Product } from '@/hooks/use-products';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';

// ─── Label size presets ───────────────────────────────────────────────────────
const LABEL_SIZES = [
  { id: '50x25', label: '50 × 25 mm', w: 50, h: 25 },
  { id: '60x30', label: '60 × 30 mm', w: 60, h: 30 },
  { id: '80x40', label: '80 × 40 mm', w: 80, h: 40 },
  { id: '100x50', label: '100 × 50 mm', w: 100, h: 50 },
] as const;

type LabelSizeId = (typeof LABEL_SIZES)[number]['id'];

interface QueueItem {
  product: Product;
  qty: number;
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

function drawBarcode(canvas: HTMLCanvasElement, text: string, opts: { width: number; height: number; showText?: boolean }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
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
    if (idx % 2 === 0) ctx.fillRect(Math.round(x), 2, Math.max(1, Math.round(w)), barAreaH - 4);
    x += w;
  });

  if (opts.showText) {
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.min(10, textAreaH - 2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, opts.width / 2, opts.height - 2);
  }
}

// ─── Single label component ───────────────────────────────────────────────────
function BarcodeLabel({
  product,
  sizeId,
  showPrice,
  showCode,
}: {
  product: Product;
  sizeId: LabelSizeId;
  showPrice: boolean;
  showCode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];
  // Scale for screen preview: 2.8346 px per mm
  const scale = 2.8346;
  const pw = Math.round(size.w * scale);
  const ph = Math.round(size.h * scale);

  const barcodeValue = product.productCode;

  useEffect(() => {
    if (!canvasRef.current) return;
    const textAreaH = 14;
    const priceH = showPrice ? 12 : 0;
    const codeH = showCode ? 10 : 0;
    const headerH = 14;
    const barH = ph - headerH - priceH - codeH - textAreaH - 8;
    drawBarcode(canvasRef.current, barcodeValue, {
      width: pw - 8,
      height: Math.max(20, barH),
      showText: true,
    });
  }, [barcodeValue, pw, ph, showPrice, showCode]);

  return (
    <div
      className="label-card flex flex-col overflow-hidden rounded border border-slate-300 bg-white shadow-sm"
      style={{ width: pw, height: ph, padding: 4 }}
    >
      {/* Product name */}
      <p
        className="truncate text-center font-semibold leading-tight text-slate-900"
        style={{ fontSize: Math.max(7, size.h * 0.16) }}
        title={product.description}
      >
        {product.description}
      </p>
      {/* Barcode */}
      <div className="flex flex-1 items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
      {/* Optional details */}
      {showPrice && (
        <p className="text-center font-bold text-slate-800" style={{ fontSize: Math.max(7, size.h * 0.14) }}>
          ₹{Number(product.sellingPrice).toFixed(2)}
        </p>
      )}
      {showCode && (
        <p className="text-center text-slate-500" style={{ fontSize: Math.max(6, size.h * 0.1) }}>
          {product.productCode}
        </p>
      )}
    </div>
  );
}

// ─── Product search & selector ────────────────────────────────────────────────
function ProductSelector({ onAdd }: { onAdd: (product: Product) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = useProducts({ search, limit: 20, isActive: true });
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
            className="fixed inset-0 z-10"
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
                  <div className="min-w-0">
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
  const [sizeId, setSizeId] = useState<LabelSizeId>('60x30');
  const [showPrice, setShowPrice] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [cols, setCols] = useState(4);
  const printRef = useRef<HTMLDivElement>(null);

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
      if (existing) return prev.map((q) => q.product.id === product.id ? { ...q, qty: q.qty + 1 } : q);
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const removeItem = (productId: string) => setQueue((prev) => prev.filter((q) => q.product.id !== productId));
  const changeQty = (productId: string, delta: number) => {
    setQueue((prev) =>
      prev
        .map((q) => q.product.id === productId ? { ...q, qty: Math.max(1, q.qty + delta) } : q)
    );
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    // Gather canvas data URLs before writing to print window
    const canvases = printRef.current.querySelectorAll<HTMLCanvasElement>('canvas');
    const dataUrls: string[] = [];
    canvases.forEach((c) => dataUrls.push(c.toDataURL('image/png')));

    let labelIdx = 0;
    let labelsHtml = '';
    queue.forEach(({ product, qty }) => {
      for (let i = 0; i < qty; i++) {
        const imgSrc = dataUrls[labelIdx++] ?? '';
        const priceHtml = showPrice
          ? `<p style="margin:0;text-align:center;font-weight:bold;font-size:${Math.max(7, size.h * 0.14)}px;">₹${Number(product.sellingPrice).toFixed(2)}</p>`
          : '';
        const codeHtml = showCode
          ? `<p style="margin:0;text-align:center;color:#64748b;font-size:${Math.max(6, size.h * 0.1)}px;">${product.productCode}</p>`
          : '';
        labelsHtml += `
          <div style="width:${size.w}mm;height:${size.h}mm;border:1px solid #ccc;display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:1mm;box-sizing:border-box;overflow:hidden;break-inside:avoid;margin:1mm;">
            <p style="margin:0;font-size:${Math.max(7, size.h * 0.16)}px;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${product.description}</p>
            <img src="${imgSrc}" style="flex:1;max-width:100%;object-fit:contain;" />
            ${priceHtml}
            ${codeHtml}
          </div>`;
      }
    });

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Barcode Labels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #fff; }
    .grid { display: flex; flex-wrap: wrap; padding: 4mm; gap: 0; }
    @page { margin: 4mm; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="grid">${labelsHtml}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const totalLabels = queue.reduce((s, q) => s + q.qty, 0);
  const selectedSize = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];

  // Expanded labels list for preview
  const previewItems: Product[] = [];
  queue.forEach(({ product, qty }) => {
    for (let i = 0; i < Math.min(qty, 8); i++) previewItems.push(product);
  });

  return (
    <AppLayout active="Print Labels">
      <div className="space-y-6">
        <PageHeader
          title="Print Barcode Labels"
          description="Search for products, configure label size, and print directly from your browser."
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

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* ── Left panel ── */}
          <div className="space-y-5">
            {/* Product search */}
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

            {/* Queue */}
            {queue.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Label Queue · {totalLabels} label{totalLabels !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {queue.map(({ product, qty }) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-900">{product.description}</p>
                        <p className="text-[10px] text-slate-400">{product.productCode}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          id={`qty-dec-${product.id}`}
                          className="rounded p-0.5 hover:bg-slate-200"
                          onClick={() => changeQty(product.id, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{qty}</span>
                        <button
                          type="button"
                          id={`qty-inc-${product.id}`}
                          className="rounded p-0.5 hover:bg-slate-200"
                          onClick={() => changeQty(product.id, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        id={`remove-${product.id}`}
                        className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => removeItem(product.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Label options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Label Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Size */}
                <div className="space-y-2">
                  <Label>Label Size</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {LABEL_SIZES.map((s) => (
                      <button
                        key={s.id}
                        id={`size-${s.id}`}
                        type="button"
                        onClick={() => setSizeId(s.id)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                          sizeId === s.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50',
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <Label>Show on label</Label>
                  <div className="space-y-2">
                    <button
                      id="toggle-price"
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50"
                      onClick={() => setShowPrice((v) => !v)}
                    >
                      {showPrice
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-slate-400" />}
                      <span>Selling Price</span>
                    </button>
                    <button
                      id="toggle-code"
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50"
                      onClick={() => setShowCode((v) => !v)}
                    >
                      {showCode
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-slate-400" />}
                      <span>Product Code</span>
                    </button>
                  </div>
                </div>

                {/* Columns */}
                <div className="space-y-2">
                  <Label>Preview Columns</Label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded border border-slate-200 p-1 hover:bg-slate-100"
                      onClick={() => setCols((c) => Math.max(1, c - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{cols}</span>
                    <button
                      type="button"
                      className="rounded border border-slate-200 p-1 hover:bg-slate-100"
                      onClick={() => setCols((c) => Math.min(8, c + 1))}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right panel — preview ── */}
          <Card className="min-h-[400px]">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Preview · {selectedSize.label}
                  {totalLabels > 8 && <span className="ml-2 text-xs font-normal text-slate-400">(showing first 8 per product)</span>}
                </CardTitle>
                {queue.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-red-500"
                    onClick={() => setQueue([])}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {previewItems.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                  <Barcode className="h-12 w-12 opacity-30" />
                  <div className="text-center">
                    <p className="font-medium">No labels yet</p>
                    <p className="text-sm">Search and add products on the left</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={printRef}
                  className="flex flex-wrap gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                  style={{ gap: '10px' }}
                >
                  {previewItems.map((product, idx) => (
                    <BarcodeLabel
                      key={`${product.id}-${idx}`}
                      product={product}
                      sizeId={sizeId}
                      showPrice={showPrice}
                      showCode={showCode}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

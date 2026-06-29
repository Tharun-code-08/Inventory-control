import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BarcodeInput, BarcodeNotFoundDialog } from '@/components/shared';
import { lookupBarcode, type BarcodeProduct } from '@/hooks/use-barcodes';
import { getApiErrorMessage } from '@/lib/api-error';
import { playScanError, playScanSuccess } from '@/lib/scan-feedback';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Product } from '@/hooks/use-products';
import type { GstSupplyType } from '@/lib/gst-supply-type';
import { isInterStateSupply } from '@/lib/gst-supply-type';
import {
  GST_FULL_PRESETS,
  GST_HALF_PRESETS,
  computeSalesLineGst,
  productGstRateToLinePercents,
} from '@/lib/sales-order-gst';

export type SalesLineDraft = {
  productId: string;
  quantity: string;
  unitPrice: string;
  uom: string;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
};

export function emptySalesLine(): SalesLineDraft {
  return {
    productId: '',
    quantity: '1',
    unitPrice: '0',
    uom: 'pcs',
    cgstPercent: '9',
    sgstPercent: '9',
    igstPercent: '18',
  };
}

type Props = {
  items: SalesLineDraft[];
  products: Product[];
  supplyType: GstSupplyType;
  onChange: (items: SalesLineDraft[]) => void;
  formatAmount: (value: number) => string;
  compact?: boolean;
  /** Shop context recorded with each scan for audit; scanning is enabled regardless. */
  scanShopId?: string;
};

function updateLine(items: SalesLineDraft[], index: number, patch: Partial<SalesLineDraft>) {
  return items.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

function GstPercentSelect({
  value,
  onChange,
  presets,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  presets: readonly number[];
  compact?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={compact ? 'h-8 w-[4.5rem] text-xs' : 'h-8 w-20 text-xs'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {presets.map((preset) => (
          <SelectItem key={preset} value={String(preset)}>
            {preset}%
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function applyProductGstToLine(
  product: Pick<Product, 'gstRate'> | undefined,
  supplyType: GstSupplyType,
): Partial<SalesLineDraft> {
  const gstRate = Number(product?.gstRate ?? 0);
  if (gstRate <= 0) return {};
  const percents = productGstRateToLinePercents(gstRate, supplyType);
  return {
    cgstPercent: String(percents.cgstPercent),
    sgstPercent: String(percents.sgstPercent),
    igstPercent: String(percents.igstPercent),
  };
}

export function SalesOrderLineItemsEditor({
  items,
  products,
  supplyType,
  onChange,
  formatAmount,
  compact,
  scanShopId,
}: Props) {
  const selectContentClass = compact ? 'max-w-[min(24rem,90vw)]' : undefined;
  const interState = isInterStateSupply(supplyType);

  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [unknownBarcodePolicy, setUnknownBarcodePolicy] = useState<'AUTO_CREATE' | 'ASK' | 'REJECT' | null>(null);
  // Latest items + a promise chain so rapid scans apply sequentially instead
  // of clobbering each other through stale prop closures.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const scanQueue = useRef<Promise<void>>(Promise.resolve());

  const addScannedProduct = (productId: string, payload?: BarcodeProduct) => {
    const current = itemsRef.current;
    const existingIndex = current.findIndex((line) => line.productId === productId);
    if (existingIndex >= 0) {
      const next = updateLine(current, existingIndex, {
        quantity: String((Number(current[existingIndex].quantity) || 0) + 1),
      });
      itemsRef.current = next;
      onChange(next);
      return;
    }
    const catalog = products.find((p) => p.id === productId);
    const newLine: SalesLineDraft = {
      ...emptySalesLine(),
      productId,
      unitPrice: String(catalog?.sellingPrice ?? payload?.sellingPrice ?? '0'),
      uom: catalog?.uom ?? payload?.uom ?? 'pcs',
      ...applyProductGstToLine(
        catalog ?? (payload ? { gstRate: Number(payload.gstRate) } : undefined),
        supplyType,
      ),
    };
    const blankIndex = current.findIndex((line) => !line.productId);
    const next =
      blankIndex >= 0
        ? current.map((line, i) => (i === blankIndex ? newLine : line))
        : [...current, newLine];
    itemsRef.current = next;
    onChange(next);
  };

  const handleScan = (code: string) => {
    scanQueue.current = scanQueue.current.then(async () => {
      try {
        const result = await lookupBarcode(code, 'SALES_ORDER', scanShopId);
        if (result.duplicate) return; // server flagged a double-fired scan
        if (result.found) {
          playScanSuccess();
          addScannedProduct(result.product.id, result.product);
        } else {
          playScanError();
          setUnknownBarcode(result.barcode);
          setUnknownBarcodePolicy(result.policy || 'ASK');
        }
      } catch (err) {
        playScanError();
        toast.error(getApiErrorMessage(err, 'Scan failed'));
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">Line items</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BarcodeInput
            onScan={handleScan}
            allowRepeatScans
            autoFocus={false}
            className="w-full sm:w-64"
            placeholder="Scan barcode to add item…"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange([...items, emptySalesLine()])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add item
          </Button>
        </div>
      </div>

      <BarcodeNotFoundDialog
        barcode={unknownBarcode}
        policy={unknownBarcodePolicy}
        shopId={scanShopId}
        onClose={() => {
          setUnknownBarcode(null);
          setUnknownBarcodePolicy(null);
        }}
        products={products}
        onAttached={(productId) => addScannedProduct(productId)}
      />
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80">
              <TableHead className="min-w-[10rem] text-xs">Product</TableHead>
              <TableHead className="text-xs">Qty</TableHead>
              <TableHead className="text-xs">UOM</TableHead>
              <TableHead className="text-xs">Rate</TableHead>
              <TableHead className="text-xs text-right">Taxable</TableHead>
              {interState ? (
                <TableHead className="text-xs">IGST%</TableHead>
              ) : (
                <>
                  <TableHead className="text-xs">CGST%</TableHead>
                  <TableHead className="text-xs">SGST%</TableHead>
                </>
              )}
              <TableHead className="text-xs text-right">Tax</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((line, index) => {
              const computed = computeSalesLineGst({
                quantity: Number(line.quantity),
                unitPrice: Number(line.unitPrice),
                cgstPercent: Number(line.cgstPercent),
                sgstPercent: Number(line.sgstPercent),
                igstPercent: Number(line.igstPercent),
                supplyType,
              });
              const product = products.find((p) => p.id === line.productId);

              return (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={line.productId || 'none'}
                      onValueChange={(v) => {
                        if (v === 'none') return;
                        const p = products.find((x) => x.id === v);
                        onChange(
                          updateLine(items, index, {
                            productId: v,
                            unitPrice: String(p?.sellingPrice ?? line.unitPrice),
                            uom: p?.uom ?? line.uom,
                            ...applyProductGstToLine(p, supplyType),
                          }),
                        );
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        <SelectItem value="none" disabled>
                          Select product
                        </SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.productCode} — {p.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {product && !compact ? (
                      <p className="mt-1 text-xs text-muted-foreground">{product.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0.0001"
                      className="h-8 w-20 text-xs"
                      value={line.quantity}
                      onChange={(e) =>
                        onChange(updateLine(items, index, { quantity: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 w-16 text-xs" value={line.uom} readOnly />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 w-24 text-xs"
                      value={line.unitPrice}
                      onChange={(e) =>
                        onChange(updateLine(items, index, { unitPrice: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatAmount(computed.taxable)}
                  </TableCell>
                  {interState ? (
                    <TableCell>
                      <GstPercentSelect
                        compact={compact}
                        presets={GST_FULL_PRESETS}
                        value={line.igstPercent}
                        onChange={(v) => onChange(updateLine(items, index, { igstPercent: v }))}
                      />
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>
                        <GstPercentSelect
                          compact={compact}
                          presets={GST_HALF_PRESETS}
                          value={line.cgstPercent}
                          onChange={(v) => onChange(updateLine(items, index, { cgstPercent: v }))}
                        />
                      </TableCell>
                      <TableCell>
                        <GstPercentSelect
                          compact={compact}
                          presets={GST_HALF_PRESETS}
                          value={line.sgstPercent}
                          onChange={(v) => onChange(updateLine(items, index, { sgstPercent: v }))}
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatAmount(computed.taxAmount)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">
                    {formatAmount(computed.lineTotal)}
                  </TableCell>
                  <TableCell>
                    {items.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 dark:text-red-400"
                        onClick={() => onChange(items.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

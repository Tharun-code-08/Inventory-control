import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  product: Product | undefined,
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
}: Props) {
  const selectContentClass = compact ? 'max-w-[min(24rem,90vw)]' : undefined;
  const interState = isInterStateSupply(supplyType);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Line items</h3>
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
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
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
                      <p className="mt-1 text-xs text-slate-500">{product.description}</p>
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
                  <TableCell className="text-right text-xs tabular-nums text-slate-600">
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
                  <TableCell className="text-right text-xs tabular-nums text-slate-600">
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
                        className="h-8 w-8 text-red-600"
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

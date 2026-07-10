import type { GstSupplyType } from '@/lib/gst-supply-type';
import { isInterStateSupply, supplyTypeLabel } from '@/lib/gst-supply-type';
import { computeOrderGstTotals, type SalesLineGstComputed } from '@/lib/sales-order-gst';

type Props = {
  lines: SalesLineGstComputed[];
  supplyType: GstSupplyType;
  formatAmount: (value: number) => string;
};

export function SalesOrderGstSummary({ lines, supplyType, formatAmount }: Props) {
  const totals = computeOrderGstTotals(lines);
  const interState = isInterStateSupply(supplyType);

  return (
    <div className="space-y-1 rounded-lg bg-muted px-3 py-2 text-sm">
      <p className="text-xs font-medium text-muted-foreground">{supplyTypeLabel(supplyType)}</p>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Subtotal (taxable)</span>
        <span className="tabular-nums">{formatAmount(totals.subtotalBeforeTax)}</span>
      </div>
      {interState ? (
        <div className="flex items-center justify-between text-muted-foreground">
          <span>IGST</span>
          <span className="tabular-nums">{formatAmount(totals.totalIgst)}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>CGST</span>
            <span className="tabular-nums">{formatAmount(totals.totalCgst)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>SGST</span>
            <span className="tabular-nums">{formatAmount(totals.totalSgst)}</span>
          </div>
        </>
      )}
      <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-foreground">
        <span>Grand total</span>
        <span className="tabular-nums text-foreground">{formatAmount(totals.grandTotal)}</span>
      </div>
    </div>
  );
}

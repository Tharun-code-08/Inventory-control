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
    <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <p className="text-xs font-medium text-slate-500">{supplyTypeLabel(supplyType)}</p>
      <div className="flex items-center justify-between text-slate-600">
        <span>Subtotal (taxable)</span>
        <span className="tabular-nums">{formatAmount(totals.subtotalBeforeTax)}</span>
      </div>
      {interState ? (
        <div className="flex items-center justify-between text-slate-600">
          <span>IGST</span>
          <span className="tabular-nums">{formatAmount(totals.totalIgst)}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-slate-600">
            <span>CGST</span>
            <span className="tabular-nums">{formatAmount(totals.totalCgst)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>SGST</span>
            <span className="tabular-nums">{formatAmount(totals.totalSgst)}</span>
          </div>
        </>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
        <span>Grand total</span>
        <span className="tabular-nums text-indigo-800">{formatAmount(totals.grandTotal)}</span>
      </div>
    </div>
  );
}

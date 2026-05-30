import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Rfq } from '@/hooks/use-rfqs';
import {
  useCreateQuotation,
  useSubmitQuotation,
  type CreateQuotationPayload,
} from '@/hooks/use-quotations';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatInr } from '@/lib/format-money';

type ManualLine = {
  rfqItemId: string;
  label: string;
  qty: number;
  uom: string;
  unitPrice: string;
};

export type ManualResponseSupplier = {
  supplierId: string;
  supplierName: string;
};

function buildQuotationNotes(leadTimeDays: string, notes: string): string | undefined {
  const parts: string[] = [];
  const lead = leadTimeDays.trim();
  if (lead && Number.isFinite(Number(lead)) && Number(lead) >= 0) {
    parts.push(`Lead time: ${Number(lead)} days`);
  }
  const extra = notes.trim();
  if (extra) parts.push(extra);
  return parts.length > 0 ? parts.join('\n') : undefined;
}

function linesFromRfq(rfq: Rfq): ManualLine[] {
  return (rfq.items ?? []).map((item) => ({
    rfqItemId: item.id,
    label: item.product?.productCode
      ? `${item.product.productCode}${item.product.description ? ` — ${item.product.description}` : ''}`
      : item.description ?? 'Item',
    qty: Number(item.quantity),
    uom: item.uom,
    unitPrice: '',
  }));
}

type ManualSupplierResponseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: Rfq;
  supplier: ManualResponseSupplier | null;
};

export function ManualSupplierResponseDialog({
  open,
  onOpenChange,
  rfq,
  supplier,
}: ManualSupplierResponseDialogProps) {
  const createQuote = useCreateQuotation();
  const submitQuote = useSubmitQuotation();
  const [lines, setLines] = useState<ManualLine[]>([]);
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !supplier) return;
    setLines(linesFromRfq(rfq));
    setLeadTimeDays('');
    setNotes('');
  }, [open, rfq, supplier]);

  const grandTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const price = Number(line.unitPrice) || 0;
        return sum + line.qty * price;
      }, 0),
    [lines],
  );

  const saving = createQuote.isPending || submitQuote.isPending;

  async function handleSubmit() {
    if (!supplier) return;

    const priced = lines.filter((line) => Number(line.unitPrice) > 0);
    if (priced.length === 0) {
      toast.error('Enter a unit price for at least one line');
      return;
    }

    const payload: CreateQuotationPayload = {
      rfqId: rfq.id,
      supplierId: supplier.supplierId,
      notes: buildQuotationNotes(leadTimeDays, notes),
      items: priced.map((line) => {
        const rfqItem = rfq.items.find((item) => item.id === line.rfqItemId);
        return {
          rfqItemId: line.rfqItemId,
          productId: rfqItem?.productId ?? undefined,
          description: rfqItem?.description ?? rfqItem?.product?.description ?? undefined,
          quantity: line.qty,
          uom: line.uom,
          specifications: rfqItem?.specifications ?? undefined,
          unitPrice: Number(line.unitPrice),
        };
      }),
    };

    try {
      const created = await createQuote.mutateAsync(payload);
      await submitQuote.mutateAsync(created.id);
      toast.success(`Response saved for ${supplier.supplierName}`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save supplier response'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add supplier response</DialogTitle>
          <DialogDescription>
            {supplier
              ? `Enter pricing for ${supplier.supplierName}. Total is calculated automatically.`
              : 'Enter pricing for each requested item.'}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-xs uppercase">Product</TableHead>
                <TableHead className="text-right text-xs uppercase">Required qty</TableHead>
                <TableHead className="text-xs uppercase">Unit</TableHead>
                <TableHead className="text-right text-xs uppercase">Unit price</TableHead>
                <TableHead className="text-right text-xs uppercase">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => {
                const lineTotal = line.qty * (Number(line.unitPrice) || 0);
                return (
                  <TableRow key={line.rfqItemId}>
                    <TableCell className="text-sm font-medium">{line.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.qty}</TableCell>
                    <TableCell className="text-slate-600">{line.uom}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-xs"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, unitPrice: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(lineTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end text-sm font-semibold text-slate-900">
          Grand total: <span className="ml-2 text-indigo-700">{formatInr(grandTotal)}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="manual-lead-time">Lead time (days)</Label>
            <Input
              id="manual-lead-time"
              type="number"
              min="0"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="manual-notes">Notes</Label>
            <Textarea
              id="manual-notes"
              rows={2}
              placeholder="Optional notes from the supplier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : 'Submit response'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

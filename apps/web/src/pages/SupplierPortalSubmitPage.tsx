import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  FileText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { portalGet, portalPost } from '@/lib/portal-api';
import { BrandLogo } from '@/components/BrandLogo';

type Step = 1 | 2 | 3 | 4;

type VerifyResult = {
  supplier: { id: string; supplierName: string; email: string };
  openRfqs: Array<{ id: string; rfqNumber: string; title: string }>;
  selectedRfqId: string | null;
};

type PortalRfq = {
  id: string;
  rfqNumber: string;
  title: string;
  notes?: string | null;
  items: Array<{
    id: string;
    quantity: string | number;
    uom: string;
    specifications?: string | null;
    description?: string | null;
    product?: { productCode: string; description: string } | null;
  }>;
};

type QuoteLine = {
  rfqItemId: string;
  label: string;
  qty: number;
  uom: string;
  unitPrice: string;
};

const STEPS = [
  { n: 1, label: 'Verify' },
  { n: 2, label: 'Review RFQ' },
  { n: 3, label: 'Submit Quote' },
  { n: 4, label: 'Done' },
] as const;

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-6">
      {STEPS.map((s, idx) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <li key={s.n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition',
                  done && 'border-primary bg-primary text-white',
                  active && !done && 'border-primary bg-white text-primary',
                  !done && !active && 'border-slate-200 bg-white text-slate-400',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span
                className={cn(
                  'hidden text-[10px] font-medium uppercase tracking-wide sm:block',
                  active ? 'text-primary' : 'text-slate-400',
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 ? (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1',
                  done ? 'bg-primary' : 'bg-slate-200',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function SupplierPortalSubmitPage() {
  const [searchParams] = useSearchParams();
  const presetRfqId = searchParams.get('rfq') ?? '';

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState(presetRfqId);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [rfq, setRfq] = useState<PortalRfq | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmation, setConfirmation] = useState<{
    referenceCode: string;
    totalValue: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const grandTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = line.qty;
        const price = Number(line.unitPrice) || 0;
        return sum + qty * price;
      }, 0),
    [lines],
  );

  async function handleVerify() {
    setLoading(true);
    try {
      const result = await portalPost<VerifyResult>('/supplier-portal/verify', {
        email: email.trim(),
        rfqId: accessCode.trim() || undefined,
      });
      setVerifyResult(result);
      const rfqId = result.selectedRfqId ?? result.openRfqs[0]?.id;
      if (!rfqId) {
        toast.error('No open RFQs are assigned to your company right now.');
        return;
      }
      const detail = await portalGet<PortalRfq>(`/supplier-portal/rfqs/${rfqId}`, {
        supplier_id: result.supplier.id,
      });
      setRfq(detail);
      setLines(
        detail.items.map((item) => ({
          rfqItemId: item.id,
          label: item.product
            ? `${item.product.productCode} — ${item.product.description}`
            : item.description ?? 'Item',
          qty: Number(item.quantity),
          uom: item.uom,
          unitPrice: '',
        })),
      );
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!verifyResult || !rfq) return;
    const priced = lines.filter((l) => Number(l.unitPrice) > 0);
    if (priced.length === 0) {
      toast.error('Enter a unit price for at least one line');
      return;
    }
    setLoading(true);
    try {
      const result = await portalPost<{ referenceCode: string; totalValue: number }>(
        '/supplier-portal/quotes',
        {
          rfqId: rfq.id,
          supplierId: verifyResult.supplier.id,
          leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
          notes: notes.trim() || undefined,
          items: priced.map((l) => ({
            rfqItemId: l.rfqItemId,
            unitPrice: Number(l.unitPrice),
          })),
        },
      );
      setConfirmation(result);
      setStep(4);
      toast.success('Quote submitted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit quote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-3xl">
          <BrandLogo
            size={40}
            subtitle="Supplier Portal"
            titleClassName="text-white"
            subtitleClassName="text-slate-300"
          />
        </div>
      </header>

      <Stepper current={step} />

      <main className="mx-auto max-w-2xl px-4 pb-12">
        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Verify your identity</h1>
              <p className="mt-1 text-sm text-slate-500">Enter your details to access the RFQ</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Email address</Label>
                <Input
                  type="email"
                  placeholder="supplier@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>RFQ reference (optional)</Label>
                <Input
                  placeholder="Paste RFQ id from invitation link"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                />
              </div>
            </div>
            <Button className="mt-6 w-full" disabled={loading} onClick={handleVerify}>
              {loading ? 'Checking…' : 'Continue'}
            </Button>
          </div>
        )}

        {step === 2 && rfq && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col items-center text-center">
              <FileText className="mb-2 h-10 w-10 text-primary" />
              <h1 className="text-xl font-semibold">Review RFQ details</h1>
              <p className="text-sm text-slate-500">Confirm items before pricing your quote</p>
            </div>
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-center">
              <p className="font-semibold text-slate-900">
                {rfq.rfqNumber} — {rfq.title}
              </p>
              {verifyResult?.supplier && (
                <p className="text-sm text-slate-500">{verifyResult.supplier.supplierName}</p>
              )}
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Requested items
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.rfqItemId} className="border-t">
                      <td className="px-3 py-2 font-medium">{line.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{line.qty}</td>
                      <td className="px-3 py-2 text-slate-600">{line.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>Proceed to quote</Button>
            </div>
          </div>
        )}

        {step === 3 && rfq && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col items-center text-center">
              <Send className="mb-2 h-10 w-10 text-primary" />
              <h1 className="text-xl font-semibold">Submit your quote</h1>
              <p className="text-sm text-slate-500">Enter unit pricing for each line</p>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit price</th>
                    <th className="px-3 py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const lineTotal = line.qty * (Number(line.unitPrice) || 0);
                    return (
                      <tr key={line.rfqItemId} className="border-t">
                        <td className="px-3 py-2">{line.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.qty}</td>
                        <td className="px-3 py-2">
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
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-slate-50 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right">
                      Grand total
                    </td>
                    <td className="px-3 py-2 text-right text-primary">
                      ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Lead time (days)</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-9"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Additional notes</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={loading} onClick={handleSubmit}>
                {loading ? 'Submitting…' : 'Submit quote'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && confirmation && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Quote submitted!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your quote has been submitted successfully.
            </p>
            <div className="mx-auto mt-6 max-w-sm rounded-xl bg-slate-50 px-4 py-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Reference number
              </p>
              <p className="text-lg font-bold text-slate-900">{confirmation.referenceCode}</p>
              <hr className="my-3 border-slate-200" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Total quote value
              </p>
              <p className="text-lg font-bold text-primary">
                ₹{confirmation.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <p className="mx-auto mt-6 max-w-md text-xs text-slate-500">
              The procurement team will review your submission. Save your reference number for
              follow-up.
            </p>
          </div>
        )}
      </main>

      <footer className="pb-8 text-center text-xs text-slate-400">
        Powered by Retail IMS · Supplier Portal
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInvoices } from '@/hooks/use-invoices';
import { useCreatePayment, usePayments } from '@/hooks/use-payments';
import { P2PFlowTimeline } from '@/components/shared';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';

export function PaymentsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreatePayment = hasPermission(user, 'shop:write');
  const { data: payments = [] } = usePayments();
  const { data: invoices = [] } = useInvoices();
  const createPayment = useCreatePayment();
  const [form, setForm] = useState({ invoiceId: '', amount: '0', method: '', reference: '', remarks: '' });

  const selectedInvoice = invoices.find((inv) => inv.id === form.invoiceId);
  const totalValue = Number(selectedInvoice?.totalValue ?? 0);
  const paidValue = Number(selectedInvoice?.paidValue ?? 0);
  const openBalance = Math.max(totalValue - paidValue, 0);

  const onCreate = async () => {
    if (!form.invoiceId) return;
    await createPayment.mutateAsync({
      invoiceId: form.invoiceId,
      amount: Number(form.amount),
      method: form.method || undefined,
      reference: form.reference || undefined,
      remarks: form.remarks || undefined,
      idempotencyKey:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `pay-${Date.now()}`,
    });
    setForm({ invoiceId: '', amount: '0', method: '', reference: '', remarks: '' });
  };

  const today = new Date();
  const aging = invoices.reduce(
    (acc, inv) => {
      const balance = Math.max(Number(inv.totalValue ?? 0) - Number(inv.paidValue ?? 0), 0);
      if (balance <= 0 || !inv.dueDate) return acc;
      const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) acc.current += balance;
      else if (days <= 30) acc.overdue30 += balance;
      else acc.overdueMore += balance;
      return acc;
    },
    { current: 0, overdue30: 0, overdueMore: 0 },
  );

  return (
    <AppLayout active="Payments">
      <div className={createOnly ? 'create-page-shell space-y-6 p-4 sm:p-6' : 'space-y-6'}>
        <PageHeader title={createOnly ? 'Record Payment' : 'Payments'} description={createOnly ? 'Create a new payment receipt' : 'Record inbound payments against issued invoices.'}>
          {createOnly ? (
            <Button variant="outline" onClick={() => navigate('/payments')} className="w-full sm:w-auto">Back</Button>
          ) : (
            <Button className="premium-button border-0 text-white" onClick={() => navigate('/payments/new')} disabled={!canCreatePayment}>Add Payment</Button>
          )}
        </PageHeader>
        {!createOnly && <P2PFlowTimeline
          title="P2P flow"
          steps={[
            { key: 'po', label: 'PO confirmed', state: 'done' },
            { key: 'gr', label: 'Partial/Full GR', state: 'done' },
            { key: 'return', label: 'Goods return', state: 'done' },
            { key: 'invoice', label: 'Invoice generated', state: 'active' },
            { key: 'payment', label: 'Payment tracking', state: 'active', helper: 'Track open balances and partial settlements' },
          ]}
        />}

        {!createOnly && <Card className="surface-1 border-white/10">
          <CardHeader><CardTitle>Receivables Aging</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="surface-2 rounded-lg border p-3"><p className="text-xs text-slate-400">Current</p><p className="text-lg font-semibold text-slate-100">{aging.current.toFixed(2)}</p></div>
            <div className="surface-2 rounded-lg border p-3"><p className="text-xs text-slate-400">1-30 days overdue</p><p className="text-lg font-semibold text-slate-100">{aging.overdue30.toFixed(2)}</p></div>
            <div className="surface-2 rounded-lg border p-3"><p className="text-xs text-slate-400">{'>'}30 days overdue</p><p className="text-lg font-semibold text-slate-100">{aging.overdueMore.toFixed(2)}</p></div>
          </CardContent>
        </Card>}

        <Card className="surface-1 border-white/10">
          <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Invoice ID</Label><Input list="invoice-list" value={form.invoiceId} onChange={(e) => setForm((p) => ({ ...p, invoiceId: e.target.value }))} /><datalist id="invoice-list">{invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" min="0.01" max={openBalance || undefined} value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Method</Label><Input value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))} placeholder="Bank Transfer / Cash / UPI" /></div>
            <div className="space-y-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} /></div>
            <div className="surface-2 space-y-1 rounded-md border px-3 py-2 text-sm md:col-span-2">
              <p>Total: {totalValue.toFixed(2)} | Paid: {paidValue.toFixed(2)} | Open: <span className="font-semibold">{openBalance.toFixed(2)}</span></p>
              {selectedInvoice?.dueDate ? <p className="text-xs text-muted-foreground">Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p> : null}
            </div>
            <div className="md:col-span-2">
              <Button onClick={onCreate} className="premium-button border-0 text-white" disabled={!canCreatePayment}>
                Record Payment
              </Button>
            </div>
          </CardContent>
        </Card>

        {!createOnly && <Card className="surface-1 border-white/10">
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.length === 0 ? <TableRow><TableCell colSpan={5}>No payments found.</TableCell></TableRow> : payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.receiptNumber}</TableCell>
                    <TableCell>{new Date(p.receiptDate).toLocaleDateString()}</TableCell>
                    <TableCell>{p.invoice?.invoiceNumber ?? '-'}</TableCell>
                    <TableCell>{Number(p.amount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{p.method ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>}
      </div>
    </AppLayout>
  );
}


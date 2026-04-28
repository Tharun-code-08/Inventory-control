import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInvoices } from '@/hooks/use-invoices';
import { useCreatePayment, usePayments } from '@/hooks/use-payments';

export function PaymentsPage() {
  const { data: payments = [] } = usePayments();
  const { data: invoices = [] } = useInvoices();
  const createPayment = useCreatePayment();
  const [form, setForm] = useState({ invoiceId: '', amount: '0', method: '', reference: '', remarks: '' });

  const onCreate = async () => {
    if (!form.invoiceId) return;
    await createPayment.mutateAsync({
      invoiceId: form.invoiceId,
      amount: Number(form.amount),
      method: form.method || undefined,
      reference: form.reference || undefined,
      remarks: form.remarks || undefined,
    });
    setForm({ invoiceId: '', amount: '0', method: '', reference: '', remarks: '' });
  };

  return (
    <AppLayout active="Payments">
      <div className="space-y-6">
        <PageHeader title="Payments" description="Record inbound payments against issued invoices." />
        <Card>
          <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Invoice ID</Label><Input list="invoice-list" value={form.invoiceId} onChange={(e) => setForm((p) => ({ ...p, invoiceId: e.target.value }))} /><datalist id="invoice-list">{invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" min="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Method</Label><Input value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))} placeholder="Bank Transfer / Cash / UPI" /></div>
            <div className="space-y-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate}>Record Payment</Button></div>
          </CardContent>
        </Card>

        <Card>
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
        </Card>
      </div>
    </AppLayout>
  );
}


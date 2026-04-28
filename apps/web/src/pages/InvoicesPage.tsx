import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers } from '@/hooks/use-customers';
import { useCreateInvoice, useInvoices } from '@/hooks/use-invoices';
import { useSalesOrders } from '@/hooks/use-sales-orders';

export function InvoicesPage() {
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: salesOrders = [] } = useSalesOrders();
  const createInvoice = useCreateInvoice();
  const [form, setForm] = useState({
    customerId: '',
    salesOrderId: '',
    totalValue: '0',
    dueDate: '',
    remarks: '',
  });

  const onCreate = async () => {
    if (!form.customerId) return;
    await createInvoice.mutateAsync({
      customerId: form.customerId,
      salesOrderId: form.salesOrderId || undefined,
      totalValue: Number(form.totalValue),
      dueDate: form.dueDate || undefined,
      remarks: form.remarks || undefined,
    });
    setForm({ customerId: '', salesOrderId: '', totalValue: '0', dueDate: '', remarks: '' });
  };

  return (
    <AppLayout active="Invoices">
      <div className="space-y-6">
        <PageHeader title="Invoices" description="Manual and sales-order-based customer invoicing." />
        <Card>
          <CardHeader><CardTitle>Create Invoice</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Customer ID</Label><Input list="customer-list" value={form.customerId} onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))} /><datalist id="customer-list">{customers.map((c) => <option key={c.id} value={c.id}>{c.customerName}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Sales Order ID (optional)</Label><Input list="sales-order-list" value={form.salesOrderId} onChange={(e) => setForm((p) => ({ ...p, salesOrderId: e.target.value }))} /><datalist id="sales-order-list">{salesOrders.map((so) => <option key={so.id} value={so.id}>{so.soNumber}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Total Value</Label><Input type="number" min="0" value={form.totalValue} onChange={(e) => setForm((p) => ({ ...p, totalValue: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate}>Create Invoice</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.length === 0 ? <TableRow><TableCell colSpan={6}>No invoices found.</TableCell></TableRow> : invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.invoiceNumber}</TableCell>
                    <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell>{inv.customer?.customerName ?? '-'}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                    <TableCell>{Number(inv.totalValue ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{Number(inv.paidValue ?? 0).toFixed(2)}</TableCell>
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


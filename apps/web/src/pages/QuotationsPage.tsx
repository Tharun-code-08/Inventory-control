import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRfqs } from '@/hooks/use-rfqs';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useQuotations, useCreateQuotation, useSubmitQuotation } from '@/hooks/use-quotations';

export function QuotationsPage() {
  const { data: rfqs = [] } = useRfqs();
  const { data: suppliers = [] } = useSuppliers();
  const { data: quotations = [] } = useQuotations();
  const createQuotation = useCreateQuotation();
  const submitQuotation = useSubmitQuotation();
  const [form, setForm] = useState({
    rfqId: '',
    supplierId: '',
    quantity: '1',
    unitPrice: '0',
    description: '',
  });

  const onCreate = async () => {
    if (!form.rfqId || !form.supplierId) return;
    await createQuotation.mutateAsync({
      rfqId: form.rfqId,
      supplierId: form.supplierId,
      items: [
        {
          description: form.description || 'Quoted item',
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          uom: 'UNIT',
        },
      ],
    });
    setForm({ rfqId: '', supplierId: '', quantity: '1', unitPrice: '0', description: '' });
  };

  return (
    <AppLayout active="Quotations">
      <div className="space-y-6">
        <PageHeader title="Quotations" description="Supplier bid entry and comparison staging." />
        <Card>
          <CardHeader><CardTitle>Create Quotation</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>RFQ ID</Label><Input list="rfq-list" value={form.rfqId} onChange={(e) => setForm((p) => ({ ...p, rfqId: e.target.value }))} /><datalist id="rfq-list">{rfqs.map((r) => <option key={r.id} value={r.id}>{r.rfqNumber}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Supplier ID</Label><Input list="supplier-list" value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))} /><datalist id="supplier-list">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate} disabled={createQuotation.isPending}>{createQuotation.isPending ? 'Saving...' : 'Create Quotation'}</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quotation List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Quote No</TableHead><TableHead>RFQ</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {quotations.length === 0 ? <TableRow><TableCell colSpan={5}>No quotations found.</TableCell></TableRow> : quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.quoteNumber}</TableCell>
                    <TableCell>{q.rfq?.rfqNumber ?? '-'}</TableCell>
                    <TableCell>{q.supplier?.supplierName ?? '-'}</TableCell>
                    <TableCell><StatusBadge status={q.status} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => submitQuotation.mutate(q.id)}>Submit</Button></TableCell>
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

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useRfqs, useCreateRfq, useSendRfq } from '@/hooks/use-rfqs';

export function RfqsPage() {
  const { data: suppliers = [] } = useSuppliers();
  const { data: rfqs = [] } = useRfqs();
  const createRfq = useCreateRfq();
  const sendRfq = useSendRfq();
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    notes: '',
    supplierId: '',
    itemDescription: '',
    quantity: '1',
    uom: 'UNIT',
  });

  const onCreate = async () => {
    if (!form.title.trim() || !form.supplierId) return;
    await createRfq.mutateAsync({
      title: form.title,
      deadline: form.deadline || undefined,
      notes: form.notes || undefined,
      suppliers: [form.supplierId],
      items: [{ description: form.itemDescription || 'General item', quantity: Number(form.quantity), uom: form.uom }],
    });
    setForm({ title: '', deadline: '', notes: '', supplierId: '', itemDescription: '', quantity: '1', uom: 'UNIT' });
  };

  return (
    <AppLayout active="RFQs">
      <div className="space-y-6">
        <PageHeader title="RFQs" description="Create and send quotation requests to suppliers." />
        <Card>
          <CardHeader><CardTitle>Create RFQ</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2">
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(value) => setForm((p) => ({ ...p, supplierId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Item Description</Label><Input value={form.itemDescription} onChange={(e) => setForm((p) => ({ ...p, itemDescription: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate} disabled={createRfq.isPending}>{createRfq.isPending ? 'Saving...' : 'Create RFQ'}</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>RFQ List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>RFQ No</TableHead><TableHead>Title</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {rfqs.length === 0 ? <TableRow><TableCell colSpan={5}>No RFQs found.</TableCell></TableRow> : rfqs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.rfqNumber}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.deadline ? new Date(r.deadline).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => sendRfq.mutate(r.id)}>Send</Button></TableCell>
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

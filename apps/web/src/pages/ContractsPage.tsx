import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useContracts, useCreateContract, useActivateContract } from '@/hooks/use-contracts';

export function ContractsPage() {
  const { data: suppliers = [] } = useSuppliers();
  const { data: contracts = [] } = useContracts();
  const createContract = useCreateContract();
  const activateContract = useActivateContract();
  const [form, setForm] = useState({
    supplierId: '',
    title: '',
    startDate: '',
    endDate: '',
    quantity: '1',
    unitPrice: '0',
  });

  const onCreate = async () => {
    if (!form.supplierId || !form.title.trim()) return;
    await createContract.mutateAsync({
      supplierId: form.supplierId,
      title: form.title,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      items: [
        {
          description: form.title,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          uom: 'UNIT',
        },
      ],
    });
    setForm({ supplierId: '', title: '', startDate: '', endDate: '', quantity: '1', unitPrice: '0' });
  };

  return (
    <AppLayout active="Contracts">
      <div className="space-y-6">
        <PageHeader title="Contracts" description="Create and activate supplier contracts." />
        <Card>
          <CardHeader><CardTitle>Create Contract</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Supplier ID</Label><Input list="supplier-id-list" value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))} /><datalist id="supplier-id-list">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate} disabled={createContract.isPending}>{createContract.isPending ? 'Saving...' : 'Create Contract'}</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contract List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Contract No</TableHead><TableHead>Title</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {contracts.length === 0 ? <TableRow><TableCell colSpan={5}>No contracts found.</TableCell></TableRow> : contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.contractNumber}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.supplier?.supplierName ?? '-'}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => activateContract.mutate(c.id)}>Activate</Button></TableCell>
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

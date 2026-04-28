import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers, useCreateCustomer } from '@/hooks/use-customers';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const { data: customers = [] } = useCustomers(search);
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({ customerName: '', email: '', phone: '', city: '', state: '', postalCode: '' });

  const onCreate = async () => {
    if (!form.customerName.trim()) return;
    await createCustomer.mutateAsync({ ...form, isActive: true });
    setForm({ customerName: '', email: '', phone: '', city: '', state: '', postalCode: '' });
  };

  return (
    <AppLayout active="Customers">
      <div className="space-y-6">
        <PageHeader title="Customers" description="Sales customer master and contact details.">
          <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageHeader>
        <Card>
          <CardHeader><CardTitle>Create Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Name</Label><Input value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Postal Code</Label><Input value={form.postalCode} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} /></div>
            <div className="md:col-span-3"><Button onClick={onCreate}>Create Customer</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {customers.length === 0 ? <TableRow><TableCell colSpan={5}>No customers found.</TableCell></TableRow> : customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.customerCode}</TableCell>
                    <TableCell>{c.customerName}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.isActive ? 'Active' : 'Inactive'}</TableCell>
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


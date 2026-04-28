import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanies, useCreateCompany, useDeleteCompany } from '@/hooks/use-companies';

export function CompaniesPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const [form, setForm] = useState({
    companyCode: '',
    companyName: '',
    address: '',
    isActive: true,
  });

  const onCreate = async () => {
    if (!form.companyName.trim()) return;
    await createCompany.mutateAsync(form);
    setForm({ companyCode: '', companyName: '', address: '', isActive: true });
  };

  return (
    <AppLayout active="Companies">
      <div className="space-y-6">
        <PageHeader title="Companies" description="Company master setup for plants and suppliers." />
        <Card>
          <CardHeader>
            <CardTitle>Create Company</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Code (optional)</Label>
              <Input value={form.companyCode} onChange={(e) => setForm((p) => ({ ...p, companyCode: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))} />
              <Label>Active</Label>
            </div>
            <div className="md:col-span-2">
              <Button onClick={onCreate} disabled={createCompany.isPending}>
                {createCompany.isPending ? 'Saving...' : 'Create Company'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading...</TableCell>
                  </TableRow>
                ) : companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No companies found.</TableCell>
                  </TableRow>
                ) : (
                  companies.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.companyCode}</TableCell>
                      <TableCell>{item.companyName}</TableCell>
                      <TableCell>{item.address || '-'}</TableCell>
                      <TableCell>{item.isActive ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => deleteCompany.mutate(item.id)}>
                          Deactivate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

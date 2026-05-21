import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from '@/hooks/use-companies';
import { cn } from '@/lib/cn';

export function CompaniesPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const deactivateCompany = useDeleteCompany();
  const updateCompany = useUpdateCompany();
  const [form, setForm] = useState({
    companyCode: '',
    companyName: '',
    address: '',
    isActive: true,
  });
  const actionPending = deactivateCompany.isPending || updateCompany.isPending;

  const onDeactivate = async (id: string) => {
    try {
      await deactivateCompany.mutateAsync(id);
      toast.success('Company deactivated');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to deactivate company';
      toast.error(msg);
    }
  };

  const onActivate = async (id: string) => {
    try {
      await updateCompany.mutateAsync({ id, isActive: true });
      toast.success('Company activated');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to activate company';
      toast.error(msg);
    }
  };

  const onCreate = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    try {
      await createCompany.mutateAsync({
        companyCode: form.companyCode.trim() || undefined,
        companyName: form.companyName.trim(),
        address: form.address.trim() || undefined,
        isActive: form.isActive,
      });
      setForm({ companyCode: '', companyName: '', address: '', isActive: true });
      toast.success('Company created');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to create company';
      toast.error(msg);
    }
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
                      <TableCell>
                        <StatusBadge status={item.isActive ? 'Active' : 'Deactive'} />
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeactivate(item.id)}
                            disabled={actionPending}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(
                              'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900',
                            )}
                            onClick={() => onActivate(item.id)}
                            disabled={actionPending}
                          >
                            Activate
                          </Button>
                        )}
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

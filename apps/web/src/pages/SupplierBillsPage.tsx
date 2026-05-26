import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateSupplierBillFromGr, useSupplierBills } from '@/hooks/use-supplier-bills';
import { useGoodsReceipts } from '@/hooks/use-goods-receipts';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/api-error';

export function SupplierBillsPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? undefined;
  const { data: bills = [], refetch } = useSupplierBills({ shopId, take: 100 });
  const { data: grData } = useGoodsReceipts({ status: 'POSTED', shopId, limit: 100 });
  const createFromGr = useCreateSupplierBillFromGr();
  const [form, setForm] = useState({
    grId: '',
    dueDate: '',
    remarks: '',
  });

  const postedGrs = grData?.items ?? [];

  const onCreate = async () => {
    if (!form.grId.trim()) {
      toast.error('Select a posted goods receipt');
      return;
    }
    try {
      await createFromGr.mutateAsync({
        grId: form.grId.trim(),
        dueDate: form.dueDate || undefined,
        remarks: form.remarks || undefined,
      });
      toast.success('Supplier bill created');
      setForm({ grId: '', dueDate: '', remarks: '' });
      refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create supplier bill'));
    }
  };

  return (
    <AppLayout active="Supplier Bills">
      <div className="space-y-6">
        <PageHeader
          title="Supplier Bills"
          description="Create payable bills from posted goods receipts."
        />

        <Card>
          <CardHeader>
            <CardTitle>Create from Goods Receipt</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Posted GR</Label>
              <Input
                list="gr-list"
                value={form.grId}
                onChange={(e) => setForm((p) => ({ ...p, grId: e.target.value }))}
                placeholder="Goods receipt id"
              />
              <datalist id="gr-list">
                {postedGrs.map((gr) => (
                  <option key={gr.id} value={gr.id}>
                    {gr.grNumber} — {gr.supplierName}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button onClick={onCreate} disabled={createFromGr.isPending}>
                Create bill
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier bills</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No supplier bills found.</TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.billNumber}</TableCell>
                      <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                      <TableCell>{bill.supplier?.supplierName ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {bill.purchaseOrderId ?? '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={bill.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(bill.totalValue ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(bill.paidValue ?? 0).toFixed(2)}
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

import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { DocumentReferenceSelect, PageHeader } from '@/components/shared';
import { DocumentRowActions } from '@/components/shared/DocumentRowActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateSupplierBillFromGr, useSupplierBills, useVoidSupplierBill } from '@/hooks/use-supplier-bills';
import { useGoodsReceipts } from '@/hooks/use-goods-receipts';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/api-error';
import { displayDocumentNumber, formatGrOption } from '@/lib/document-display';

export function SupplierBillsPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? undefined;
  const { data: bills = [], refetch } = useSupplierBills({ shopId, take: 100 });
  const { data: grData } = useGoodsReceipts({ status: 'POSTED', shopId, limit: 100 });
  const createFromGr = useCreateSupplierBillFromGr();
  const voidBill = useVoidSupplierBill();
  const [form, setForm] = useState({
    grId: '',
    dueDate: '',
    remarks: '',
  });

  const postedGrs = grData?.items ?? [];

  const onVoidBill = async (billId: string) => {
    const reason = window.prompt('Reason for voiding this bill (optional):') ?? undefined;
    try {
      await voidBill.mutateAsync({ id: billId, reason: reason?.trim() || undefined });
      toast.success('Supplier bill voided');
      refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to void supplier bill'));
    }
  };

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
              <DocumentReferenceSelect
                items={postedGrs}
                value={form.grId}
                onValueChange={(grId) => setForm((p) => ({ ...p, grId }))}
                getValue={(gr) => gr.id}
                getLabel={(gr) => formatGrOption(gr)}
                placeholder="Select goods receipt"
              />
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No supplier bills found.</TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.billNumber}</TableCell>
                      <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                      <TableCell>{bill.supplier?.supplierName ?? '—'}</TableCell>
                      <TableCell>
                        {displayDocumentNumber(
                          bill.purchaseOrder?.poNumber ?? bill.purchaseOrderId,
                        )}
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {bill.status === 'ISSUED' && Number(bill.paidValue ?? 0) === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={voidBill.isPending}
                              onClick={() => onVoidBill(bill.id)}
                            >
                              Void
                            </Button>
                          ) : null}
                          <DocumentRowActions kind="supplier-bill" id={bill.id} />
                        </div>
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

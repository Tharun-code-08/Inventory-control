import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { DocumentReferenceSelect, PageHeader } from '@/components/shared';
import { DocumentRowActions } from '@/components/shared/DocumentRowActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateSupplierPayment, useSupplierPayments } from '@/hooks/use-supplier-payments';
import { useSupplierBills } from '@/hooks/use-supplier-bills';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatBillOption } from '@/lib/document-display';

export function SupplierPaymentsPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? undefined;
  const { data: payments = [], refetch } = useSupplierPayments();
  const { data: bills = [] } = useSupplierBills({ shopId, take: 100 });
  const createPayment = useCreateSupplierPayment();
  const [form, setForm] = useState({
    supplierBillId: '',
    amount: '0',
    method: '',
    reference: '',
    remarks: '',
  });

  const selectedBill = bills.find((b) => b.id === form.supplierBillId);
  const totalValue = Number(selectedBill?.totalValue ?? 0);
  const paidValue = Number(selectedBill?.paidValue ?? 0);
  const openBalance = Math.max(totalValue - paidValue, 0);

  const onCreate = async () => {
    if (!form.supplierBillId) {
      toast.error('Select a supplier bill');
      return;
    }
    try {
      await createPayment.mutateAsync({
        supplierBillId: form.supplierBillId,
        amount: Number(form.amount),
        method: form.method || undefined,
        reference: form.reference || undefined,
        remarks: form.remarks || undefined,
        idempotencyKey:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `spay-${Date.now()}`,
      });
      toast.success('Supplier payment recorded');
      setForm({ supplierBillId: '', amount: '0', method: '', reference: '', remarks: '' });
      refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to record payment'));
    }
  };

  return (
    <AppLayout active="Supplier Payments">
      <div className="space-y-6">
        <PageHeader
          title="Supplier Payments"
          description="Record outbound payments against supplier bills."
        />

        <Card>
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier bill</Label>
              <DocumentReferenceSelect
                items={bills}
                value={form.supplierBillId}
                onValueChange={(supplierBillId) =>
                  setForm((p) => ({ ...p, supplierBillId }))
                }
                getValue={(bill) => bill.id}
                getLabel={(bill) => formatBillOption(bill)}
                placeholder="Select supplier bill"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                max={openBalance || undefined}
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Input
                value={form.method}
                onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              />
            </div>
            <div className="rounded-md border px-3 py-2 text-sm md:col-span-2">
              Total: {totalValue.toFixed(2)} | Paid: {paidValue.toFixed(2)} | Open:{' '}
              <span className="font-semibold">{openBalance.toFixed(2)}</span>
            </div>
            <div className="md:col-span-2">
              <Button onClick={onCreate} disabled={createPayment.isPending}>
                Record payment
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No supplier payments found.</TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentNumber}</TableCell>
                      <TableCell>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.supplierBill?.billNumber ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        {Number(payment.amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{payment.method ?? '-'}</TableCell>
                      <TableCell>
                        <DocumentRowActions kind="supplier-payment" id={payment.id} />
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

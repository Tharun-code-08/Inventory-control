import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers } from '@/hooks/use-customers';
import { useProducts } from '@/hooks/use-products';
import { useSalesOrders, useCreateSalesOrder, useConfirmSalesOrder, useFulfillSalesOrder } from '@/hooks/use-sales-orders';
import { useCreateInvoice } from '@/hooks/use-invoices';

export function SalesPage() {
  const { data: customers = [] } = useCustomers();
  const { data: productsData } = useProducts();
  const products = productsData?.data ?? [];
  const { data: salesOrders = [] } = useSalesOrders();
  const createSalesOrder = useCreateSalesOrder();
  const confirmSalesOrder = useConfirmSalesOrder();
  const fulfillSalesOrder = useFulfillSalesOrder();
  const createInvoice = useCreateInvoice();
  const [form, setForm] = useState({ customerId: '', productId: '', quantity: '1', unitPrice: '0' });

  const onCreate = async () => {
    if (!form.customerId || !form.productId) return;
    await createSalesOrder.mutateAsync({
      customerId: form.customerId,
      items: [{ productId: form.productId, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), uom: 'UNIT' }],
    });
    setForm({ customerId: '', productId: '', quantity: '1', unitPrice: '0' });
  };

  const onCreateInvoiceFromSalesOrder = async (salesOrderId: string) => {
    const so = salesOrders.find((row) => row.id === salesOrderId);
    if (!so || !(so as { customerId?: string }).customerId) return;
    await createInvoice.mutateAsync({
      salesOrderId: so.id,
      customerId: (so as { customerId: string }).customerId,
      totalValue: Number(so.totalValue ?? 0),
      remarks: `Auto-created from sales order ${so.soNumber}`,
    });
  };

  return (
    <AppLayout active="Sales">
      <div className="space-y-6">
        <PageHeader title="Sales" description="Sales order -> goods issue -> stock decrease workflow." />
        <Card>
          <CardHeader><CardTitle>Create Sales Order</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Customer ID</Label><Input list="customer-list" value={form.customerId} onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))} /><datalist id="customer-list">{customers.map((c) => <option key={c.id} value={c.id}>{c.customerName}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Product ID</Label><Input list="product-list" value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))} /><datalist id="product-list">{products.map((p) => <option key={p.id} value={p.id}>{p.productCode}</option>)}</datalist></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate}>Create Sales Order</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sales Orders</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>SO Number</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {salesOrders.length === 0 ? <TableRow><TableCell colSpan={5}>No sales orders found.</TableCell></TableRow> : salesOrders.map((so) => (
                  <TableRow key={so.id}>
                    <TableCell>{so.soNumber}</TableCell>
                    <TableCell>{new Date(so.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{so.customer?.customerName ?? '-'}</TableCell>
                    <TableCell><StatusBadge status={so.status} /></TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => confirmSalesOrder.mutate(so.id)}>Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => fulfillSalesOrder.mutate(so.id)}>Fulfill</Button>
                      <Button size="sm" variant="outline" onClick={() => onCreateInvoiceFromSalesOrder(so.id)}>Create Invoice</Button>
                    </TableCell>
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


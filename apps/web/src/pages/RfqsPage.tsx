import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProducts } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useRfqs, useCreateRfq, useSendRfq } from '@/hooks/use-rfqs';
import { useAuthStore } from '@/store/authStore';

export function RfqsPage() {
  const user = useAuthStore((state) => state.user);
  const { data: shops = [] } = useShops();
  const { data: suppliers = [] } = useSuppliers();
  const { data: productsData } = useProducts({ isActive: true, limit: 500 });
  const products = productsData?.items ?? [];
  const { data: rfqs = [] } = useRfqs();
  const createRfq = useCreateRfq();
  const sendRfq = useSendRfq();
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    notes: '',
    shopId: '',
    supplierId: '',
  });
  const [items, setItems] = useState([{ productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);

  const resolvedShopId = user?.shopId ?? form.shopId ?? shops[0]?.id ?? '';

  const addItemRow = () => {
    setItems((prev) => [...prev, { productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (index: number, key: 'productId' | 'quantity' | 'uom' | 'specifications', value: string) => {
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        if (key === 'productId') {
          const selectedProduct = products.find((product) => product.id === value);
          return { ...row, productId: value, uom: selectedProduct?.uom || row.uom };
        }
        return { ...row, [key]: value };
      }),
    );
  };

  const onCreate = async () => {
    if (!resolvedShopId) {
      toast.error('Please select a plant');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.supplierId) {
      toast.error('Supplier is required');
      return;
    }
    const normalizedItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Number(item.quantity || 1)),
        uom: item.uom || 'UNIT',
        specifications: item.specifications || undefined,
      }));
    if (normalizedItems.length === 0) {
      toast.error('Add at least one product item');
      return;
    }

    try {
      await createRfq.mutateAsync({
        shopId: resolvedShopId,
        title: form.title,
        deadline: form.deadline || undefined,
        notes: form.notes || undefined,
        suppliers: [form.supplierId],
        items: normalizedItems,
      });
      toast.success('RFQ created successfully');
      setForm({ title: '', deadline: '', notes: '', shopId: '', supplierId: '' });
      setItems([{ productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to create RFQ';
      toast.error(msg);
    }
  };

  return (
    <AppLayout active="RFQs">
      <div className="space-y-6">
        <PageHeader title="RFQs" description="Create and send quotation requests to suppliers." />
        <Card>
          <CardHeader><CardTitle>Create RFQ</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} /></div>
            {!user?.shopId && (
              <div className="space-y-2 md:col-span-2">
                <Label>Plant</Label>
                <Select value={form.shopId || resolvedShopId} onValueChange={(value) => setForm((p) => ({ ...p, shopId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.shopName} ({shop.shopNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                  + Add Item
                </Button>
              </div>

              <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Product</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-3">Specifications</div>
                <div className="col-span-1"> </div>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <Select value={item.productId} onValueChange={(value) => updateItemRow(index, 'productId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productCode} - {product.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input value={item.uom} readOnly className="bg-muted" />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={item.specifications}
                      onChange={(e) => updateItemRow(index, 'specifications', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => removeItemRow(index)}>
                        X
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div><Button onClick={onCreate} disabled={createRfq.isPending}>{createRfq.isPending ? 'Saving...' : 'Create RFQ'}</Button></div>
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
                    <TableCell><StatusBadge status={r.status} /></TableCell>
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

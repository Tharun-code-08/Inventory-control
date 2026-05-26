import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useCreateStockTransfer,
  usePostStockTransfer,
  useStockTransfers,
  type StockTransferLine,
} from '@/hooks/use-stock-transfers';
import { useProducts, type Product } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { getApiErrorMessage } from '@/lib/api-error';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function extractProducts(raw: unknown): Product[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Product[];
  if (typeof raw === 'object') {
    const source = raw as { items?: Product[]; data?: Product[]; rows?: Product[] };
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.data)) return source.data;
    if (Array.isArray(source.rows)) return source.rows;
  }
  return [];
}

export function StockTransfersPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const { data: transfers = [], refetch } = useStockTransfers();
  const createTransfer = useCreateStockTransfer();
  const postTransfer = usePostStockTransfer();
  const { data: shops = [] } = useShops();

  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [fromStorageLocationId, setFromStorageLocationId] = useState('');
  const [toStorageLocationId, setToStorageLocationId] = useState('');
  const [transferDate, setTransferDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<StockTransferLine[]>([
    { productId: '', quantity: 1, uom: '' },
  ]);

  const { data: fromLocations = [] } = useStorageLocations(fromShopId || undefined);
  const { data: toLocations = [] } = useStorageLocations(toShopId || undefined);
  const { data: productsRaw } = useProducts({
    shopId: fromShopId || undefined,
    isActive: true,
    limit: 200,
    page: 1,
  });
  const products = useMemo(() => extractProducts(productsRaw), [productsRaw]);

  const swapShops = () => {
    setFromShopId(toShopId);
    setToShopId(fromShopId);
    setFromStorageLocationId(toStorageLocationId);
    setToStorageLocationId(fromStorageLocationId);
    setLines([{ productId: '', quantity: 1, uom: '' }]);
  };

  const updateLine = (index: number, patch: Partial<StockTransferLine>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const onProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateLine(index, {
      productId,
      uom: product?.uom ?? '',
    });
  };

  const onCreate = async () => {
    if (!fromShopId || !toShopId) {
      toast.error('Select from and to plants');
      return;
    }
    if (fromShopId === toShopId) {
      toast.error('From and to plants must differ');
      return;
    }
    const validLines = lines.filter((l) => l.productId && l.quantity > 0 && l.uom);
    if (validLines.length === 0) {
      toast.error('Add at least one line');
      return;
    }
    try {
      await createTransfer.mutateAsync({
        fromShopId,
        toShopId,
        fromStorageLocationId: fromStorageLocationId || undefined,
        toStorageLocationId: toStorageLocationId || undefined,
        transferDate,
        notes: notes || undefined,
        items: validLines,
      });
      toast.success('Stock transfer created');
      navigate('/stock-transfers');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create transfer'));
    }
  };

  const onPost = async (id: string) => {
    try {
      await postTransfer.mutateAsync(id);
      toast.success('Transfer posted');
      refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to post transfer'));
    }
  };

  if (createOnly) {
    return (
      <AppLayout active="Stock Transfers">
        <div className="create-page-shell space-y-6 p-4 sm:p-6">
          <PageHeader
            title="New stock transfer"
            description="Move stock between plants and storage locations."
          >
            <Button variant="outline" onClick={() => navigate('/stock-transfers')}>
              Back
            </Button>
          </PageHeader>

          <Card>
            <CardHeader>
              <CardTitle>Transfer details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>From plant</Label>
                  <Select value={fromShopId} onValueChange={setFromShopId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.shopName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To plant</Label>
                  <Select value={toShopId} onValueChange={setToShopId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.shopName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end md:col-span-2">
                  <Button type="button" variant="outline" onClick={swapShops}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Swap from / to
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>From storage (optional)</Label>
                  <Select
                    value={fromStorageLocationId || '__none__'}
                    onValueChange={(v) =>
                      setFromStorageLocationId(v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any / default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default</SelectItem>
                      {fromLocations
                        .filter((loc) => loc.isActive)
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name || loc.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To storage (optional)</Label>
                  <Select
                    value={toStorageLocationId || '__none__'}
                    onValueChange={(v) => setToStorageLocationId(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any / default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default</SelectItem>
                      {toLocations
                        .filter((loc) => loc.isActive)
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name || loc.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transfer date</Label>
                  <Input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lines</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLines((prev) => [...prev, { productId: '', quantity: 1, uom: '' }])
                    }
                  >
                    Add line
                  </Button>
                </div>
                {!fromShopId ? (
                  <p className="text-sm text-muted-foreground">
                    Select a from plant to filter products.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>UOM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={line.productId}
                              onValueChange={(v) => onProductSelect(index, v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.productCode} — {p.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.0001"
                              className="text-right"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(index, { quantity: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.uom}
                              onChange={(e) => updateLine(index, { uom: e.target.value })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <Button onClick={onCreate} disabled={createTransfer.isPending}>
                Save draft transfer
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="Stock Transfers">
      <div className="space-y-6">
        <PageHeader title="Stock transfers" description="Inter-plant stock movements.">
          <Button onClick={() => navigate('/stock-transfers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New transfer
          </Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No stock transfers found.</TableCell>
                  </TableRow>
                ) : (
                  transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>{transfer.transferNumber}</TableCell>
                      <TableCell>
                        {new Date(transfer.transferDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transfer.fromShop?.shopName ?? transfer.fromShopId}</TableCell>
                      <TableCell>{transfer.toShop?.shopName ?? transfer.toShopId}</TableCell>
                      <TableCell>{transfer.itemCount ?? '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={transfer.status} />
                      </TableCell>
                      <TableCell>
                        {transfer.status === 'DRAFT' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPost(transfer.id)}
                            disabled={postTransfer.isPending}
                          >
                            <Send className="mr-1 h-3.5 w-3.5" />
                            Post
                          </Button>
                        ) : null}
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

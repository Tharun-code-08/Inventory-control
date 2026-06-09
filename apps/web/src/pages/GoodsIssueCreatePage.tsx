import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/authStore';
import { useCreateGoodsIssue, usePostGoodsIssue } from '@/hooks/use-goods-issues';
import { useSalesOrder, useSalesOrders } from '@/hooks/use-sales-orders';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { useProducts, type Product } from '@/hooks/use-products';
import { isShopOnlyUser } from '@/lib/shop-scope';
import {
  ISSUE_TYPES,
  buildGiRemarks,
  type IssueType,
} from '@/lib/goods-issue';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';

function resolveProductStock(product: Product, activeShopId?: string): number {
  if (activeShopId) {
    return product.stockByShop?.[activeShopId] ?? 0;
  }
  return product.totalStock ?? product.currentStock ?? 0;
}

type LineDraft = {
  productId: string;
  productLabel: string;
  soQty: number;
  batch: string;
  issueQty: string;
  uom: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function extractProducts(raw: unknown): Product[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Product[];
  const source = raw as { items?: Product[]; data?: Product[] };
  return source.items ?? source.data ?? [];
}

export function GoodsIssueCreatePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lockedShopId = isShopOnlyUser(user) ? user!.shopId! : '';

  const [issueType, setIssueType] = useState<IssueType>('Sales Order');
  const [salesOrderId, setSalesOrderId] = useState('');
  const [shopId, setShopId] = useState(lockedShopId);
  const [storageLocationId, setStorageLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [manualProductId, setManualProductId] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const shopsQuery = useShops();
  const shops = shopsQuery.data ?? [];
  const locationsQuery = useStorageLocations(shopId || undefined);
  const locations = locationsQuery.data ?? [];
  const salesOrdersQuery = useSalesOrders();
  const filteredSalesOrders = useMemo(() => {
    const rows = (salesOrdersQuery.data ?? []).filter((so) =>
      ['CONFIRMED', 'FULFILLED'].includes(so.status),
    );
    return shopId ? rows.filter((so) => so.shopId === shopId) : rows;
  }, [salesOrdersQuery.data, shopId]);
  const salesOrderQuery = useSalesOrder(salesOrderId, issueType === 'Sales Order' && !!salesOrderId);
  const productsQuery = useProducts({
    shopId: shopId || undefined,
    isActive: true,
    limit: 100,
    page: 1,
  });
  const products = extractProducts(productsQuery.data);
  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.id, resolveProductStock(product, shopId || undefined));
    }
    return map;
  }, [products, shopId]);
  const createGi = useCreateGoodsIssue();
  const postGi = usePostGoodsIssue();
  const isSubmitting = createGi.isPending || postGi.isPending;

  useEffect(() => {
    if (lockedShopId) setShopId(lockedShopId);
  }, [lockedShopId]);

  useEffect(() => {
    setStorageLocationId('');
  }, [shopId]);

  useEffect(() => {
    if (issueType !== 'Sales Order') {
      setSalesOrderId('');
      if (issueType !== 'Others') setOtherReason('');
    }
  }, [issueType]);

  useEffect(() => {
    const order = salesOrderQuery.data;
    if (!order || issueType !== 'Sales Order') return;
    if (!shopId) setShopId(order.shopId);
    const nextLines: LineDraft[] = (order.items ?? []).map((item) => {
      const qty = Number(item.quantity) || 0;
      const shipped = Number(item.shippedQty ?? 0) || 0;
      const remaining = Math.max(0, qty - shipped);
      const code = item.product?.productCode ?? '';
      const desc = item.product?.description ?? '';
      return {
        productId: item.productId,
        productLabel: code ? `${code} — ${desc}` : desc || item.productId,
        soQty: qty,
        batch: '',
        issueQty: String(remaining > 0 ? remaining : qty),
        uom: item.uom || 'pcs',
      };
    });
    setLines(nextLines);
  }, [salesOrderQuery.data, issueType, shopId]);

  function addManualLine() {
    if (manualProductId) {
      const product = products.find((p) => p.id === manualProductId);
      if (!product) return;
      if (lines.some((l) => l.productId === product.id)) {
        toast.error('Product already added');
        return;
      }
      setLines((prev) => [
        ...prev,
        {
          productId: product.id,
          productLabel: `${product.productCode} — ${product.description}`,
          soQty: 0,
          batch: '',
          issueQty: '1',
          uom: product.uom,
        },
      ]);
      setManualProductId('');
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        productId: '',
        productLabel: '',
        soQty: 0,
        batch: '',
        issueQty: '1',
        uom: '',
      },
    ]);
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitGoodsIssue(mode: 'draft' | 'post') {
    if (!shopId) {
      toast.error('Select a plant before saving');
      return;
    }
    if (issueType === 'Others' && !otherReason.trim()) {
      toast.error('Enter the other reason for this issue');
      return;
    }
    const payloadItems = lines
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.issueQty),
        uom: line.uom,
      }))
      .filter((line) => line.productId && line.quantity > 0);

    if (payloadItems.length === 0) {
      toast.error('Add at least one line with an issue quantity greater than zero');
      return;
    }

    const overStock = payloadItems.find(
      (item) => item.quantity > (stockByProductId.get(item.productId) ?? 0),
    );
    if (overStock) {
      toast.error('Issue quantity cannot exceed available stock at the selected plant');
      return;
    }

    const reference =
      issueType === 'Sales Order' && salesOrderQuery.data
        ? salesOrderQuery.data.soNumber
        : undefined;
    const locationNote = storageLocationId
      ? locations.find((l) => l.id === storageLocationId)?.name
      : '';
    const remarkParts = buildGiRemarks(reference, notes);
    const remarks = locationNote
      ? `${remarkParts}${remarkParts ? '\n' : ''}Storage: ${locationNote}`.trim()
      : remarkParts;

    try {
      const created = await createGi.mutateAsync({
        giDate: todayISO(),
        shopId,
        issueType,
        otherReason: issueType === 'Others' ? otherReason.trim() : undefined,
        remarks: remarks || undefined,
        items: payloadItems,
      });

      if (mode === 'post') {
        await postGi.mutateAsync(created.id);
        toast.success(`Goods issue ${created.giNumber} created and posted`);
      } else {
        toast.success(`Draft ${created.giNumber} saved`);
      }

      navigate(`/goods-issues?detail=${created.id}`);
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          mode === 'post' ? 'Failed to create and post goods issue' : 'Failed to save goods issue draft',
        ),
      );
    }
  }

  const showSoTable = issueType === 'Sales Order';
  const canSubmit = !!shopId && lines.length > 0 && !isSubmitting;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              <Link to="/goods-issues" className="hover:text-primary">
                Goods Issues
              </Link>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="text-slate-700">Create New</span>
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Create Goods Issue
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Issue stock for production, maintenance, or sales orders. Saving a draft does not
              reduce warehouse stock; posting will reduce stock.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/goods-issues">
              <ArrowLeft className="h-4 w-4" />
              Back to Goods Issues
            </Link>
          </Button>
        </div>

        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issue Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {issueType === 'Others' ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Other Reason *</Label>
                <Input
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Describe why this issue is being raised"
                />
              </div>
            ) : null}

            {showSoTable ? (
              <div className="space-y-2">
                <Label>Sales Order</Label>
                <Select value={salesOrderId} onValueChange={setSalesOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales order" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSalesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        {so.soNumber}
                        {so.customer?.customerName ? ` — ${so.customer.customerName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Auto-fills items and plant from SO</p>
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-1" />
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this issue"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issue Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Plant (Issue From)</Label>
              <Select
                value={shopId}
                onValueChange={setShopId}
                disabled={!!lockedShopId}
              >
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
              <Label>Storage Location</Label>
              <Select
                value={storageLocationId}
                onValueChange={setStorageLocationId}
                disabled={!shopId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={shopId ? 'Select location (optional)' : 'Select a plant first'} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} — {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!shopId && (
                <p className="text-xs text-slate-500">Select a plant first</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Items</CardTitle>
            {!showSoTable && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={manualProductId} onValueChange={setManualProductId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Add product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.productCode} — {p.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={addManualLine}>
                  Add line
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  {showSoTable && <TableHead className="w-24">SO Qty</TableHead>}
                  <TableHead className="w-36">Batch</TableHead>
                  <TableHead className="w-28">Issue Qty</TableHead>
                  {!showSoTable && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showSoTable ? 4 : 4}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      {showSoTable
                        ? 'Select a sales order to populate items.'
                        : 'Add products to this goods issue.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={`${line.productId}-${index}`}>
                      <TableCell className="font-medium text-slate-800">
                          {!showSoTable ? (
                            <Select
                              value={line.productId}
                              onValueChange={(productId) => {
                                const product = products.find((p) => p.id === productId);
                                updateLine(index, {
                                  productId,
                                  productLabel: product
                                    ? `${product.productCode} — ${product.description}`
                                    : '',
                                  uom: product?.uom ?? line.uom,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.productCode} — {product.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            line.productLabel
                          )}
                      </TableCell>
                      {showSoTable && (
                        <TableCell className="tabular-nums text-slate-600">{line.soQty}</TableCell>
                      )}
                      <TableCell>
                        <Input
                          value={line.batch}
                          onChange={(e) => updateLine(index, { batch: e.target.value })}
                          placeholder="Optional"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative max-w-[7rem]">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={line.issueQty}
                            onChange={(e) => updateLine(index, { issueQty: e.target.value })}
                            className={cn(
                              'h-9 pr-8',
                              Number(line.issueQty) >
                                (stockByProductId.get(line.productId) ?? 0) &&
                                'border-red-400 focus-visible:ring-red-200',
                            )}
                          />
                          {Number(line.issueQty) >
                            (stockByProductId.get(line.productId) ?? 0) && (
                            <Ban
                              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500"
                              aria-hidden
                            />
                          )}
                        </div>
                        <p
                          className={cn(
                            'mt-1 text-xs font-medium tabular-nums',
                            (stockByProductId.get(line.productId) ?? 0) === 0
                              ? 'text-red-600'
                              : 'text-slate-500',
                          )}
                        >
                          Avail: {stockByProductId.get(line.productId) ?? 0}
                        </p>
                      </TableCell>
                      {!showSoTable && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeLine(index)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Save as draft to review later, or create and post to issue stock immediately.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                const hasData = lines.some((l) => l.productId || Number(l.issueQty) > 0) || notes.trim() || otherReason.trim();
                if (hasData) {
                  setCancelConfirmOpen(true);
                } else {
                  navigate('/goods-issues');
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => submitGoodsIssue('draft')}
              disabled={!canSubmit}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save as draft
            </Button>
            <Button onClick={() => submitGoodsIssue('post')} disabled={!canSubmit} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Create and post
            </Button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => !open && setCancelConfirmOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              All the data you have entered will be lost. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setCancelConfirmOpen(false);
                navigate('/goods-issues');
              }}
            >
              Yes, discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

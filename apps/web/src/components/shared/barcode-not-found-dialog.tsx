import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link2, PackagePlus, ScanLine, AlertTriangle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAttachBarcode, useMarkInvalid } from '@/hooks/use-barcodes';
import { useCreateProduct } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ProductOption = { id: string; productCode: string; description: string };

type BarcodeNotFoundDialogProps = {
  /** The scanned barcode that failed to resolve; dialog is open while non-null. */
  barcode: string | null;
  /** Unknown barcode policy from settings. Defaults to 'ASK' if null. */
  policy: 'AUTO_CREATE' | 'ASK' | 'REJECT' | null;
  /** Current active shop context. */
  shopId?: string;
  onClose: () => void;
  /** Products the user may map the barcode onto. */
  products: ProductOption[];
  /** Called after the barcode is resolved (linked or created). */
  onAttached?: (productId: string) => void;
};

type Mode = 'menu' | 'link' | 'create';

function suggestProductCode(barcode: string) {
  return barcode.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
}

export function BarcodeNotFoundDialog({
  barcode,
  policy = 'ASK',
  shopId,
  onClose,
  products,
  onAttached,
}: BarcodeNotFoundDialogProps) {
  const attach = useAttachBarcode();
  const markInvalid = useMarkInvalid();
  const createProduct = useCreateProduct();

  const [mode, setMode] = useState<Mode>('menu');
  const [error, setError] = useState<string | null>(null);

  // Link mode states
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');

  // Create mode states
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [uom, setUom] = useState('PCS');
  const [category, setCategory] = useState('GENERAL');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');

  const busy = attach.isPending || markInvalid.isPending || createProduct.isPending;

  // Reset states when a new barcode scanning triggers the dialog
  useEffect(() => {
    if (barcode) {
      setError(null);
      setQuery('');
      setSelectedId('');
      setProductCode(suggestProductCode(barcode));
      setDescription('');
      setUom('PCS');
      setCategory('GENERAL');
      setPurchasePrice('0');
      setSellingPrice('0');

      if (policy === 'AUTO_CREATE') {
        setMode('create');
      } else {
        setMode('menu');
      }
    }
  }, [barcode, policy]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? products.filter(
          (p) => p.productCode.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        )
      : products;
    return pool.slice(0, 8);
  }, [products, query]);

  const resetForm = () => {
    setQuery('');
    setSelectedId('');
    setError(null);
  };

  const handleLink = async () => {
    if (!barcode || !selectedId) return;
    try {
      await attach.mutateAsync({ productId: selectedId, barcodeValue: barcode });
      const product = products.find((p) => p.id === selectedId);
      toast.success(`Barcode mapped to ${product?.productCode ?? 'product'}`);
      resetForm();
      onAttached?.(selectedId);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not attach barcode'));
    }
  };

  const handleQuickCreate = async () => {
    if (!barcode) return;
    const code = suggestProductCode(productCode);
    if (!code) {
      setError('Product code is required (letters, numbers, - and _).');
      return;
    }
    if (description.trim().length < 2) {
      setError('Description must be at least 2 characters.');
      return;
    }
    const pPrice = Number(purchasePrice);
    const sPrice = Number(sellingPrice);
    if (isNaN(pPrice) || pPrice < 0 || isNaN(sPrice) || sPrice < 0) {
      setError('Prices must be 0 or more.');
      return;
    }
    if (!shopId) {
      setError('Active shop context is required to create a plant assignment.');
      return;
    }

    setError(null);
    try {
      // Create product and assign to current shop
      const newProd = await createProduct.mutateAsync({
        productCode: code,
        description: description.trim(),
        uom: uom.trim() || 'PCS',
        category: category.trim() || 'GENERAL',
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        isActive: true,
        plants: [
          {
            shopId,
            openingStock: 0,
            minStockLevel: 0,
            isActive: true,
          },
        ],
      });

      // Link scanned barcode to new product if different from productCode
      if (barcode !== code) {
        try {
          await attach.mutateAsync({ productId: newProd.id, barcodeValue: barcode });
        } catch {
          toast.warning('Product created, but barcode link failed.');
        }
      }

      toast.success(`Product ${newProd.productCode} created successfully`);
      resetForm();
      onAttached?.(newProd.id);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create product'));
    }
  };

  const handleMarkInvalid = async () => {
    if (!barcode) return;
    try {
      await markInvalid.mutateAsync({ code: barcode, shopId });
      toast.success('Barcode marked as invalid');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not mark invalid'));
    }
  };

  return (
    <Dialog
      open={barcode !== null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {policy === 'REJECT' ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <ScanLine className="h-5 w-5 text-primary" />
            )}
            {policy === 'REJECT' ? 'Barcode Blocked' : 'Barcode Not Registered'}
          </DialogTitle>
          <DialogDescription>
            Scanned code: <span className="font-mono font-semibold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">{barcode}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* ── POLICY: REJECT ── */}
        {policy === 'REJECT' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              This barcode is not registered. Registration of unknown barcodes is disabled by company policy settings.
            </p>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* ── POLICY: ASK / AUTO_CREATE ── */}
        {policy !== 'REJECT' && (
          <>
            {/* Mode Menu */}
            {mode === 'menu' && (
              <div className="flex flex-col gap-3 py-2">
                <Button type="button" className="gap-2" onClick={() => setMode('create')}>
                  <PackagePlus className="h-4 w-4" /> Quick Create Product
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => setMode('link')}>
                  <Link2 className="h-4 w-4" /> Link to Existing Product
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleMarkInvalid}
                  disabled={busy}
                >
                  Mark as Invalid Scan
                </Button>
                <div className="flex justify-end gap-2 border-t pt-3 mt-1">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Mode Link */}
            {mode === 'link' && (
              <div className="space-y-4 py-1">
                <div className="space-y-2">
                  <Label htmlFor="barcode-map-search">Search Existing Product</Label>
                  <Input
                    id="barcode-map-search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedId('');
                    }}
                    placeholder="Search code or description…"
                    autoComplete="off"
                    autoFocus
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1 bg-white">
                    {matches.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-slate-400">No products match.</p>
                    ) : (
                      matches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={cn(
                            'flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-50',
                            selectedId === p.id ? 'bg-primary/5 ring-1 ring-primary' : ''
                          )}
                        >
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">{p.productCode}</span>
                          <span className="truncate text-slate-800">{p.description}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setMode('menu')} disabled={busy}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                      Close
                    </Button>
                    <Button type="button" size="sm" disabled={!selectedId || busy} onClick={handleLink}>
                      {attach.isPending ? 'Linking…' : 'Link Barcode'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode Create */}
            {mode === 'create' && (
              <div className="space-y-4 py-1 max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <Label htmlFor="create-product-desc">Product Description</Label>
                    <Input
                      id="create-product-desc"
                      placeholder="e.g. Coca Cola 500ml"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <Label htmlFor="create-product-code">Product Code</Label>
                    <Input
                      id="create-product-code"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                      placeholder="e.g. COKE-500"
                      disabled={busy}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="create-product-uom">UOM</Label>
                    <Input
                      id="create-product-uom"
                      value={uom}
                      onChange={(e) => setUom(e.target.value.toUpperCase())}
                      placeholder="e.g. PCS"
                      disabled={busy}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="create-product-cat">Category</Label>
                    <Input
                      id="create-product-cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Beverages"
                      disabled={busy}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="create-product-pprice">Purchase Price (₹)</Label>
                    <Input
                      id="create-product-pprice"
                      type="number"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="create-product-sprice">Selling Price (₹)</Label>
                    <Input
                      id="create-product-sprice"
                      type="number"
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  {policy !== 'AUTO_CREATE' ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMode('menu')} disabled={busy}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleQuickCreate} disabled={busy}>
                      {createProduct.isPending ? 'Saving…' : 'Save & Attach'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

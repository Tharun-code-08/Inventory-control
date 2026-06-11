import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Link2, PackagePlus, ScanLine } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAttachBarcode } from '@/hooks/use-barcodes';
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
  onClose: () => void;
  /** Products the user may map the barcode onto. */
  products: ProductOption[];
  /** Called after the barcode is attached to a product so the caller can continue its flow. */
  onAttached?: (productId: string) => void;
};

/**
 * Recovery flow for unknown scans: map the barcode to an existing product,
 * jump to product creation, or dismiss and rescan. Keeps warehouse users out
 * of dead ends when a supplier barcode hasn't been registered yet.
 */
export function BarcodeNotFoundDialog({ barcode, onClose, products, onAttached }: BarcodeNotFoundDialogProps) {
  const navigate = useNavigate();
  const attach = useAttachBarcode();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? products.filter(
          (p) => p.productCode.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
        )
      : products;
    return pool.slice(0, 8);
  }, [products, query]);

  const reset = () => {
    setQuery('');
    setSelectedId('');
  };

  const handleAttach = async () => {
    if (!barcode || !selectedId) return;
    try {
      await attach.mutateAsync({ productId: selectedId, barcodeValue: barcode });
      const product = products.find((p) => p.id === selectedId);
      toast.success(`Barcode mapped to ${product?.productCode ?? 'product'}`);
      reset();
      onAttached?.(selectedId);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not attach barcode'));
    }
  };

  return (
    <Dialog open={barcode !== null} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" /> Barcode not found
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono">{barcode}</span> is not linked to any product yet. Map it to
            an existing product, create a new one, or close to scan again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="barcode-map-search">Map to existing product</Label>
          <Input
            id="barcode-map-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId('');
            }}
            placeholder="Search by product code or description…"
            autoComplete="off"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
            {matches.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No products match.</p>
            ) : (
              matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={
                    'flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted ' +
                    (selectedId === p.id ? 'bg-muted ring-1 ring-primary' : '')
                  }
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{p.productCode}</span>
                  <span className="truncate">{p.description}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/products/new')}
          >
            <PackagePlus className="h-3.5 w-3.5" /> Create Product
          </Button>
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>
              Scan Again
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedId || attach.isPending}
              onClick={handleAttach}
            >
              <Link2 className="h-3.5 w-3.5" /> {attach.isPending ? 'Attaching…' : 'Attach Barcode'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

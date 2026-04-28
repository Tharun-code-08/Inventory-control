import { useEffect, useState } from 'react';
import { api } from '@/api/client';

type Product = { id: string; productCode: string; description: string; uom: string };

export function ProductSearch({
  shopId,
  onSelect,
}: {
  shopId: string;
  onSelect: (p: Product) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (q.trim().length < 1) {
      setItems([]);
      setLoadError('');
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { search: q, shop_id: shopId, take: 10 } });
        const rows = (res.data.data ?? []) as Product[];
        setLoadError('');
        const needle = q.trim().toLowerCase();
        const exact = rows.find((p) => p.productCode.toLowerCase() === needle);
        if (exact) {
          onSelect(exact);
          setOpen(false);
          setQ(exact.productCode);
          setItems(rows);
          return;
        }
        setItems(rows);
        setOpen(rows.length > 0);
      } catch {
        setItems([]);
        setOpen(false);
        setLoadError('Could not load products. Is the API running and are you still signed in?');
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, shopId, onSelect]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        placeholder="Search product code..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        data-testid="product-search-input"
      />
      {loadError && <p className="mt-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      {open && items.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10" role="listbox">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              role="option"
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setQ(p.productCode);
              }}
            >
              {p.productCode} — {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

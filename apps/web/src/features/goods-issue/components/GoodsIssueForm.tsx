import { useMemo, useState } from 'react';
import { ProductSearch } from './ProductSearch';

type Product = { id: string; productCode: string; description: string; uom: string };

type SubmitPayload = {
  productId: string;
  quantity: number;
  uom: string;
  issueReason: string;
};

type GoodsIssueFormProps = {
  shopId: string;
  available?: number;
  onSubmit?: (payload: SubmitPayload) => Promise<void>;
  submitting?: boolean;
};

export function GoodsIssueForm({ shopId, available, onSubmit, submitting = false }: GoodsIssueFormProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(0);
  const [issueReason, setIssueReason] = useState('Retail sales');
  const [formError, setFormError] = useState('');

  const hasAvailability = typeof available === 'number';

  const error = useMemo(() => {
    if (qty <= 0) return '';
    if (hasAvailability && qty > (available as number)) return 'Quantity exceeds available stock';
    if (!issueReason.trim()) return 'Issue reason is required';
    return '';
  }, [qty, hasAvailability, available, issueReason]);

  const disabled = !product || qty <= 0 || !!error || submitting;

  const hint =
    !product && qty > 0
      ? 'Choose a product from the search suggestions (typing the code alone is not enough).'
      : !product
        ? 'Search by code, then click a row in the list to select the product.'
        : '';

  async function handleSubmit() {
    if (!product || qty <= 0 || error || !onSubmit) return;
    setFormError('');
    try {
      await onSubmit({
        productId: product.id,
        quantity: qty,
        uom: product.uom,
        issueReason: issueReason.trim(),
      });
      setQty(0);
      setIssueReason('Retail sales');
      setProduct(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not submit goods issue.';
      setFormError(msg);
    }
  }

  return (
    <div className="space-y-4">
      <ProductSearch shopId={shopId} onSelect={setProduct} />
      {hasAvailability ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Available stock</label>
          <div className="font-mono text-lg font-semibold text-slate-900">{available}</div>
        </div>
      ) : null}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Issue reason</label>
        <input
          type="text"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
          value={issueReason}
          onChange={(e) => setIssueReason(e.target.value)}
          placeholder="Reason for this goods issue"
          data-testid="issue-reason-input"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Quantity</label>
        <input
          type="number"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
          value={qty || ''}
          onChange={(e) => setQty(Number(e.target.value))}
          data-testid="qty-input"
        />
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="qty-error">
          {error}
        </div>
      )}
      {hint && !error && (
        <p className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-primary" data-testid="submit-hint">
          {hint}
        </p>
      )}
      {formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="submit-error">
          {formError}
        </div>
      ) : null}
      <button
        type="button"
        className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        onClick={handleSubmit}
        data-testid="submit-gi"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
}

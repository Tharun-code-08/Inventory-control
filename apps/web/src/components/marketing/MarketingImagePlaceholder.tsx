import { cn } from '@/lib/cn';
import type { MarketingImageSlot } from '@/lib/marketing-content';
import { ProductMockup, type MockupVariant } from './ProductMockup';

type MarketingImagePlaceholderProps = {
  slot: MarketingImageSlot;
  className?: string;
  aspectClassName?: string;
};

/** Maps a content slot to a generated, brand-styled SVG product scene. */
function mockupFor(id: string): { variant: MockupVariant; title: string } {
  const map: Record<string, { variant: MockupVariant; title: string }> = {
    'hero-dashboard': { variant: 'dashboard', title: 'Operations Dashboard' },
    'devices-web': { variant: 'dashboard', title: 'Operations Dashboard' },
    'devices-mobile': { variant: 'mobile', title: 'SoftdigitIMS' },
    'warehouse-products': { variant: 'table', title: 'Products' },
    'warehouse-goods-receipt': { variant: 'table', title: 'Goods Receipt' },
    'warehouse-goods-issue': { variant: 'table', title: 'Goods Issue' },
    'warehouse-reports': { variant: 'dashboard', title: 'Inventory Reports' },
    'procurement-rfq': { variant: 'table', title: 'Requests for Quotation' },
    'procurement-po': { variant: 'table', title: 'Purchase Orders' },
    'procurement-gr': { variant: 'table', title: 'Goods Receipts' },
    'procurement-supplier-portal': { variant: 'table', title: 'Supplier Portal' },
    'sales-quotations': { variant: 'table', title: 'Quotations' },
    'sales-invoices': { variant: 'invoice', title: 'GST Invoice' },
    'sales-payments': { variant: 'table', title: 'Payments' },
    'sales-dashboard': { variant: 'dashboard', title: 'Sales Dashboard' },
    'final-cta-dashboard': { variant: 'dashboard', title: 'Operations Dashboard' },
    'final-cta-mobile': { variant: 'mobile', title: 'SoftdigitIMS' },
  };
  return map[id] ?? { variant: 'dashboard', title: 'SoftdigitIMS' };
}

export function MarketingImagePlaceholder({
  slot,
  className,
  aspectClassName = 'aspect-[16/10]',
}: MarketingImagePlaceholderProps) {
  const { variant, title } = mockupFor(slot.id);
  const isMobile = variant === 'mobile';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        !isMobile && 'border border-slate-200 bg-slate-50 shadow-lg shadow-slate-900/5',
        isMobile ? 'aspect-[4/3]' : aspectClassName,
        className,
      )}
      aria-label={slot.alt}
    >
      <ProductMockup variant={variant} title={title} />
    </div>
  );
}

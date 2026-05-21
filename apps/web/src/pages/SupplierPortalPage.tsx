import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useRfqs } from '@/hooks/use-rfqs';
import { useQuotations } from '@/hooks/use-quotations';
import { usePurchaseOrders } from '@/hooks/use-purchase-orders';
import { useGoodsReceipts } from '@/hooks/use-goods-receipts';
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments } from '@/hooks/use-payments';
import { P2PFlowTimeline } from '@/components/shared';

export function SupplierPortalPage() {
  const { data: suppliers = [] } = useSuppliers();
  const { data: rfqs = [] } = useRfqs();
  const { data: quotations = [] } = useQuotations();
  const { data: poData } = usePurchaseOrders({ take: 50 });
  const { data: grData } = useGoodsReceipts({ limit: 50 });
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const purchaseOrders = Array.isArray(poData) ? poData : poData?.rows ?? poData?.data ?? [];
  const goodsReceipts = grData?.items ?? [];
  const openInvoices = invoices.filter((inv) => Number(inv.totalValue ?? 0) - Number(inv.paidValue ?? 0) > 0);
  const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return (
    <AppLayout active="Supplier Portal">
      <div className="space-y-6">
        <PageHeader title="Supplier Portal" description="Supplier-facing workspace with procurement, receipt, and payment visibility." />
        <P2PFlowTimeline
          title="Shared supplier journey"
          steps={[
            { key: 'rfq', label: 'RFQ / quotation', state: quotations.length ? 'done' : 'active' },
            { key: 'po', label: 'PO confirmed', state: purchaseOrders.length ? 'done' : 'todo' },
            { key: 'gr', label: 'Partial GR updates', state: goodsReceipts.length ? 'active' : 'todo' },
            { key: 'invoice', label: 'Invoice status', state: invoices.length ? 'active' : 'todo' },
            { key: 'payment', label: 'Payment status', state: payments.length ? 'active' : 'todo' },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle>Suppliers</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{suppliers.length}</CardContent></Card>
          <Card><CardHeader><CardTitle>Open RFQs</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rfqs.length}</CardContent></Card>
          <Card><CardHeader><CardTitle>Quotations</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{quotations.length}</CardContent></Card>
          <Card><CardHeader><CardTitle>Open Invoices</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{openInvoices.length}</CardContent></Card>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>PO visibility</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Track confirmed and partially received POs shared with suppliers.</CardContent></Card>
          <Card><CardHeader><CardTitle>GR acknowledgements</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Share line-level receipt updates as goods arrive in multiple lots.</CardContent></Card>
          <Card><CardHeader><CardTitle>Payment transparency</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Total recorded settlements: <span className="font-semibold text-foreground">{paidAmount.toFixed(2)}</span></CardContent></Card>
        </div>
      </div>
    </AppLayout>
  );
}


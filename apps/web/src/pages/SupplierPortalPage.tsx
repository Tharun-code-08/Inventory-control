import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useRfqs } from '@/hooks/use-rfqs';
import { useQuotations } from '@/hooks/use-quotations';

export function SupplierPortalPage() {
  const { data: suppliers = [] } = useSuppliers();
  const { data: rfqs = [] } = useRfqs();
  const { data: quotations = [] } = useQuotations();

  return (
    <AppLayout active="Supplier Portal">
      <div className="space-y-6">
        <PageHeader title="Supplier Portal" description="Supplier-facing summary of RFQs and quotations." />
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Suppliers</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{suppliers.length}</CardContent></Card>
          <Card><CardHeader><CardTitle>Open RFQs</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rfqs.length}</CardContent></Card>
          <Card><CardHeader><CardTitle>Quotations</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{quotations.length}</CardContent></Card>
        </div>
      </div>
    </AppLayout>
  );
}


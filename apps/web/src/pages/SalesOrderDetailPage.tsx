import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileDown,
  Pencil,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useSalesOrder,
  useConfirmSalesOrder,
  useFulfillSalesOrder,
} from '@/hooks/use-sales-orders';
import { useCreateInvoice } from '@/hooks/use-invoices';
import { useDocumentTitleOverride } from '@/hooks/use-document-title-override';
import { useDocumentEmailHistory } from '@/hooks/use-document-email-history';
import { useSendDocumentEmail } from '@/hooks/use-document-send';
import { DocumentEmailHistoryPanel } from '@/components/shared/DocumentEmailHistoryPanel';
import { PageHeader } from '@/components/shared';
import { downloadDocumentPdf } from '@/lib/document-pdf';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  formatOrderAmount,
  formatOrderDate,
  orderGrandTotal,
  parseOrderRemarks,
  statusLabel,
} from '@/lib/sales-order-doc';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';

function StatusBadge({ status }: { status: string }) {
  const label = statusLabel(status);
  const styles =
    status === 'CONFIRMED'
      ? 'bg-sky-100 text-sky-800'
      : status === 'FULFILLED'
        ? 'bg-slate-100 text-slate-700'
        : status === 'DRAFT'
          ? 'bg-amber-50 text-amber-800'
          : 'bg-slate-100 text-slate-600';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles,
      )}
    >
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-slate-200/90 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = id ?? '';

  const { data: order, isLoading, isError } = useSalesOrder(orderId);
  useDocumentTitleOverride(order?.soNumber);
  const confirmOrder = useConfirmSalesOrder();
  const fulfillOrder = useFulfillSalesOrder();
  const createInvoice = useCreateInvoice();
  const sendEmail = useSendDocumentEmail('sales-order');
  const emailHistoryQuery = useDocumentEmailHistory('sales-order', orderId || null);

  const remarks = parseOrderRemarks(order?.remarks);
  const grandTotal = order ? orderGrandTotal(order) : 0;
  const plantName = order?.shop?.shopName ?? '—';

  const onDownloadPdf = async () => {
    if (!order) return;
    try {
      await downloadDocumentPdf('sales-order', order.id);
      toast.success('PDF downloaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to download PDF'));
    }
  };

  const onSendEmail = async () => {
    if (!order) return;
    try {
      const result = await sendEmail.mutateAsync({ id: order.id, resend: order.status !== 'DRAFT' });
      if (result?.sent) toast.success('Sales order emailed with PDF');
      else if (result?.queued) toast.message(result?.message ?? 'Email queued for delivery');
      else toast.success('Email submitted');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send email'));
    }
  };

  const onConfirm = async () => {
    if (!order) return;
    try {
      await confirmOrder.mutateAsync(order.id);
      toast.success(`${order.soNumber} confirmed`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to confirm order'));
    }
  };

  const onFulfill = async () => {
    if (!order) return;
    try {
      await fulfillOrder.mutateAsync(order.id);
      toast.success(`${order.soNumber} fulfilled`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to fulfill order'));
    }
  };

  const onCreateInvoice = async () => {
    if (!order) return;
    try {
      await createInvoice.mutateAsync({
        salesOrderId: order.id,
        customerId: order.customerId,
        totalValue: grandTotal,
        remarks: `Invoice for ${order.soNumber}`,
      });
      toast.success('Invoice created');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create invoice'));
    }
  };

  const onExportCsv = () => {
    if (!order) return;
    const ok = exportModuleCsv(
      `${order.soNumber}.csv`,
      (order.items ?? []).map((item) => ({ order, item })),
      [
        { header: 'SO Number', value: ({ order: current }) => current.soNumber },
        { header: 'Order Date', value: ({ order: current }) => csvDate(current.orderDate) },
        { header: 'Expected Date', value: ({ order: current }) => csvDate(current.expectedDate) },
        { header: 'Customer', value: ({ order: current }) => current.customer?.customerName ?? '' },
        { header: 'Plant', value: ({ order: current }) => current.shop?.shopName ?? '' },
        { header: 'Status', value: ({ order: current }) => statusLabel(current.status) },
        { header: 'Quotation', value: ({ order: current }) => current.salesQuotation?.quoteNumber ?? '' },
        { header: 'Product Code', value: ({ item }) => item.product?.productCode ?? '' },
        { header: 'Description', value: ({ item }) => item.product?.description ?? '' },
        { header: 'Quantity', value: ({ item }) => item.quantity },
        { header: 'UOM', value: ({ item }) => item.uom },
        { header: 'Unit Price', value: ({ item }) => csvMoney(item.unitPrice) },
        { header: 'Line Value', value: ({ item }) => csvMoney(item.lineValue) },
        { header: 'Remarks', value: ({ order: current }) => current.remarks ?? '' },
      ],
    );
    if (ok) toast.success('Sales order exported');
    else toast.error('No sales order lines to export');
  };

  if (isLoading) {
    return (
      <AppLayout active="Sales">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !order) {
    return (
      <AppLayout active="Sales">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Sales order not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/sales">Back to Sales Orders</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const notesDisplay =
    remarks.notes ||
    (order.salesQuotation ? `Converted from Quotation ${order.salesQuotation.quoteNumber}` : '');

  return (
    <AppLayout active="Sales">
      <div className="space-y-6">
        <PageHeader title={order.soNumber}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales Orders
          </Button>
          <StatusBadge status={order.status} />
          <Button variant="outline" onClick={onExportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={onDownloadPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {order.status !== 'DRAFT' && (
            <Button variant="outline" onClick={onSendEmail} disabled={sendEmail.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {sendEmail.isPending ? 'Sending…' : 'Email customer'}
            </Button>
          )}
          <Button variant="outline" onClick={onCreateInvoice} disabled={createInvoice.isPending}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
          {order.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate('/sales', { state: { editOrderId: order.id } })}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={confirmOrder.isPending}
                onClick={onConfirm}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Order
              </Button>
            </>
          )}
          {order.status === 'CONFIRMED' && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={fulfillOrder.isPending}
              onClick={onFulfill}
            >
              Fulfill Order
            </Button>
          )}
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Customer" value={order.customer?.customerName ?? '—'} />
          <SummaryCard label="Total Amount" value={formatOrderAmount(grandTotal)} />
          <SummaryCard label="Payment Terms" value={remarks.paymentTerms} />
          <SummaryCard
            label="Delivery Date"
            value={order.expectedDate ? formatOrderDate(order.expectedDate) : '—'}
          />
        </div>

        {order.status !== 'DRAFT' && (
          <DocumentEmailHistoryPanel
            summary={emailHistoryQuery.data?.summary}
            history={emailHistoryQuery.data?.history}
            isLoading={emailHistoryQuery.isLoading}
          />
        )}

        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Product
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Plant
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Storage Loc.
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                      Qty Ordered
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                      Qty Issued
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                        No line items
                      </TableCell>
                    </TableRow>
                  ) : (
                    (order.items ?? []).map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="font-medium text-slate-900">
                            {line.product?.description ?? '—'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {line.product?.productCode ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {line.product?.description ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{plantName}</TableCell>
                        <TableCell className="text-sm text-slate-500">—</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(line.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(line.shippedQty ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatOrderAmount(line.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-slate-900">
                          {formatOrderAmount(line.lineValue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
              <div className="text-right">
                <span className="mr-4 text-sm font-semibold text-slate-900">Grand Total</span>
                <span className="text-lg font-semibold text-indigo-700">
                  {formatOrderAmount(grandTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {notesDisplay ? (
          <Card className="border-slate-200/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{notesDisplay}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}

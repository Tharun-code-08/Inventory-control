import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, Eye, ImagePlus, Pencil, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { CreatePageLayout, PageHeader } from '@/components/shared';
import { DocumentDetailActions } from '@/components/shared/DocumentDetailActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { useGoodsReceipt, useGoodsReceipts, type GoodsReceipt } from '@/hooks/use-goods-receipts';
import {
  useAcknowledgeSupplierReturn,
  useCancelSupplierReturn,
  useCreateSupplierReturn,
  useDeleteSupplierReturnImage,
  useSubmitSupplierReturn,
  useSupplierReturn,
  useSupplierReturns,
  type CreateSupplierReturnPayload,
  type SupplierReturn,
  type SupplierReturnReasonCode,
  useUpdateSupplierReturn,
  useUploadSupplierReturnImage,
} from '@/hooks/use-returns';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';
import { getApiErrorMessage } from '@/lib/api-error';

type DraftLine = {
  goodsReceiptItemId: string;
  productCode: string;
  description: string;
  grnQty: string;
  uom: string;
  enabled: boolean;
  returnQty: string;
  reasonCode: SupplierReturnReasonCode;
};

type DraftForm = {
  goodsReceiptId: string;
  returnDate: string;
  supplierRef: string;
  remarks: string;
  internalCcEmail: string;
  items: DraftLine[];
};

const REASON_OPTIONS: Array<{ value: SupplierReturnReasonCode; label: string }> = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'WRONG_ITEM', label: 'Wrong Item' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'EXCESS', label: 'Excess' },
];

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | null) {
  return csvDate(value) || '—';
}

function formatMoney(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function statusTone(status: SupplierReturn['status']) {
  switch (status) {
    case 'DONE':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'SUBMITTED':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'DRAFT':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    default:
      return 'bg-muted text-foreground border-border';
  }
}

function formatReturnStatus(status: SupplierReturn['status']) {
  switch (status) {
    case 'SUBMITTED':
      return 'Awaiting Supplier Acknowledgement';
    case 'DONE':
      return 'Completed';
    case 'DRAFT':
      return 'Draft';
    case 'CANCELLED':
      return 'Cancelled';
    case 'ACKNOWLEDGED':
      return 'Acknowledged';
    case 'POSTED':
      return 'Posted';
    default:
      return status;
  }
}

function returnStatusMessage(status: SupplierReturn['status']) {
  switch (status) {
    case 'DRAFT':
      return 'This draft has not been sent to the supplier yet, and stock has not changed.';
    case 'SUBMITTED':
      return 'The supplier email has been sent. Stock will reduce only after the supplier acknowledges this return.';
    case 'DONE':
      return 'The supplier has acknowledged this return and stock has already been reduced.';
    case 'CANCELLED':
      return 'This return was cancelled. No stock adjustment was applied.';
    case 'ACKNOWLEDGED':
      return 'The supplier has acknowledged this return.';
    case 'POSTED':
      return 'This return has already been posted.';
    default:
      return null;
  }
}

function emptyForm(): DraftForm {
  return {
    goodsReceiptId: '',
    returnDate: todayIso(),
    supplierRef: '',
    remarks: '',
    internalCcEmail: '',
    items: [],
  };
}

function buildLinesFromGoodsReceipt(gr: GoodsReceipt, existing?: SupplierReturn): DraftLine[] {
  const existingMap = new Map(
    (existing?.items ?? [])
      .filter((item) => item.goodsReceiptItemId)
      .map((item) => [item.goodsReceiptItemId!, item]),
  );

  return (gr.items ?? []).map((item) => {
    const match = existingMap.get(item.id);
    return {
      goodsReceiptItemId: item.id,
      productCode: item.product?.productCode ?? '',
      description: item.product?.description ?? '',
      grnQty: String(item.quantity ?? 0),
      uom: item.uom,
      enabled: Boolean(match),
      returnQty: match ? String(match.quantity ?? 0) : '',
      reasonCode: match?.reasonCode ?? 'DAMAGED',
    };
  });
}

export function ReturnsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const shopId = user?.shopId ?? undefined;
  const [searchParams] = useSearchParams();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<SupplierReturn | null>(null);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(emptyForm());
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const { data: returns = [] } = useSupplierReturns();
  const { data: goodsReceiptList } = useGoodsReceipts({
    shopId,
    limit: 200,
  });
  const postedGoodsReceipts = useMemo(
    () => (goodsReceiptList?.items ?? []).filter((gr) => gr.status === 'POSTED'),
    [goodsReceiptList?.items],
  );

  const selectedGoodsReceiptId = form.goodsReceiptId || searchParams.get('grId') || '';
  const goodsReceiptQuery = useGoodsReceipt(selectedGoodsReceiptId);
  const detailReturnQuery = useSupplierReturn(selectedReturnId ?? '');
  const detailReturn = selectedReturnId ? detailReturnQuery.data : null;

  const createReturn = useCreateSupplierReturn();
  const updateReturn = useUpdateSupplierReturn();
  const uploadImage = useUploadSupplierReturnImage();
  const deleteImage = useDeleteSupplierReturnImage();
  const submitReturn = useSubmitSupplierReturn();
  const acknowledgeReturn = useAcknowledgeSupplierReturn();
  const cancelReturn = useCancelSupplierReturn();

  useEffect(() => {
    const qsGrId = searchParams.get('grId');
    if (!qsGrId || form.goodsReceiptId) return;
    setForm((prev) => ({ ...prev, goodsReceiptId: qsGrId }));
    if (!createOnly) {
      navigate(`/returns/new?grId=${encodeURIComponent(qsGrId)}`, { replace: true });
    }
  }, [createOnly, form.goodsReceiptId, navigate, searchParams]);

  useEffect(() => {
    if (!createOnly) return;
    setEditingReturn(null);
    const qsGrId = searchParams.get('grId');
    setForm(qsGrId ? { ...emptyForm(), goodsReceiptId: qsGrId } : emptyForm());
  }, [createOnly, searchParams]);

  useEffect(() => {
    if (!goodsReceiptQuery.data) return;
    setForm((prev) => {
      if (prev.items.length > 0 && prev.goodsReceiptId === goodsReceiptQuery.data.id && !editingReturn) {
        return prev;
      }
      return {
        ...prev,
        goodsReceiptId: goodsReceiptQuery.data.id,
        items: buildLinesFromGoodsReceipt(goodsReceiptQuery.data, editingReturn ?? undefined),
      };
    });
  }, [editingReturn, goodsReceiptQuery.data]);

  const draftCount = returns.filter((ret) => ret.status === 'DRAFT').length;
  const submittedCount = returns.filter((ret) => ret.status === 'SUBMITTED').length;
  const doneCount = returns.filter((ret) => ret.status === 'DONE').length;

  const handleExportReturns = () => {
    const ok = exportModuleCsv('goods-returns.csv', returns, [
      { header: 'Return Number', value: (ret) => ret.returnNumber },
      { header: 'Return Date', value: (ret) => csvDate(ret.returnDate) },
      { header: 'GR Number', value: (ret) => ret.goodsReceipt?.grNumber ?? '' },
      { header: 'Supplier', value: (ret) => ret.supplier?.supplierName ?? ret.supplierName },
      { header: 'Status', value: (ret) => ret.status },
      { header: 'Items', value: (ret) => ret.items.length },
      { header: 'Total Value', value: (ret) => csvMoney(ret.totalValue) },
      { header: 'Submitted At', value: (ret) => csvDate(ret.submittedAt) },
      { header: 'Acknowledged At', value: (ret) => csvDate(ret.acknowledgedAt) },
    ]);
    if (ok) toast.success('Goods returns exported');
    else toast.error('No return orders to export');
  };

  const openCreate = () => {
    navigate('/returns/new');
  };

  const openEdit = (ret: SupplierReturn) => {
    setSelectedReturnId(null);
    setEditingReturn(ret);
    setForm({
      goodsReceiptId: ret.goodsReceiptId ?? '',
      returnDate: ret.returnDate.slice(0, 10),
      supplierRef: ret.supplierRef ?? '',
      remarks: ret.remarks ?? '',
      internalCcEmail: ret.internalCcEmail ?? '',
      items:
        ret.goodsReceiptId && goodsReceiptQuery.data?.id === ret.goodsReceiptId
          ? buildLinesFromGoodsReceipt(goodsReceiptQuery.data, ret)
          : ret.items.map((item) => ({
              goodsReceiptItemId: item.goodsReceiptItemId ?? '',
              productCode: item.product?.productCode ?? item.goodsReceiptItem?.product?.productCode ?? '',
              description:
                item.product?.description ?? item.goodsReceiptItem?.product?.description ?? '',
              grnQty: String(item.grnQuantity ?? item.goodsReceiptItem?.quantity ?? 0),
              uom: item.uom,
              enabled: true,
              returnQty: String(item.quantity ?? 0),
              reasonCode: item.reasonCode ?? 'DAMAGED',
            })),
    });
    setEditorOpen(true);
  };

  const selectedLines = form.items.filter((item) => item.enabled && Number(item.returnQty) > 0);
  const maxReturnDate = todayIso();

  const saveDraft = async () => {
    if (!form.goodsReceiptId) {
      toast.error('Select a posted goods receipt');
      return;
    }
    if (selectedLines.length === 0) {
      toast.error('Select at least one goods receipt line');
      return;
    }
    if (form.returnDate && form.returnDate > maxReturnDate) {
      toast.error('Return date cannot be in the future');
      return;
    }

    const payload: CreateSupplierReturnPayload = {
      goodsReceiptId: form.goodsReceiptId,
      returnDate: form.returnDate,
      supplierRef: form.supplierRef || undefined,
      remarks: form.remarks || undefined,
      internalCcEmail: form.internalCcEmail || undefined,
      items: selectedLines.map((line) => ({
        goodsReceiptItemId: line.goodsReceiptItemId,
        returnQty: Number(line.returnQty),
        reasonCode: line.reasonCode,
      })),
    };

    try {
      const ret = editingReturn
        ? await updateReturn.mutateAsync({ id: editingReturn.id, payload })
        : await createReturn.mutateAsync(payload);
      toast.success(editingReturn ? 'Return draft updated' : 'Return draft created');
      if (createOnly && !editingReturn) {
        navigate('/returns');
      } else {
        setEditorOpen(false);
        setEditingReturn(null);
        setSelectedReturnId(ret.id);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save return draft'));
    }
  };

  const onUploadImages = async (returnId: string, returnItemId: string, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingItemId(returnItemId);
    try {
      for (const file of Array.from(files)) {
        await uploadImage.mutateAsync({ id: returnId, file, returnItemId });
      }
      toast.success('Images uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload image'));
    } finally {
      setUploadingItemId(null);
    }
  };

  const onDeleteImage = async (returnId: string, imageId: string) => {
    try {
      await deleteImage.mutateAsync({ id: returnId, imageId });
      toast.success('Image removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove image'));
    }
  };

  const onSubmitReturn = async (returnId: string) => {
    try {
      await submitReturn.mutateAsync(returnId);
      toast.success('Return notice sent to supplier. Stock will reduce only after supplier acknowledgement.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to submit return'));
    }
  };

  const onAcknowledgeReturn = async (returnId: string) => {
    try {
      await acknowledgeReturn.mutateAsync(returnId);
      toast.success('Return accepted. Stock has been adjusted.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to accept return'));
    }
  };

  const onCancelReturn = async (returnId: string) => {
    try {
      await cancelReturn.mutateAsync(returnId);
      toast.success('Return cancelled');
      setSelectedReturnId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to cancel return'));
    }
  };

  const draftForm = (onCancel: () => void) => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Goods Receipt</Label>
          <Select
            value={form.goodsReceiptId}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, goodsReceiptId: value, items: [] }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a posted goods receipt" />
            </SelectTrigger>
            <SelectContent>
              {postedGoodsReceipts.map((gr) => (
                <SelectItem key={gr.id} value={gr.id}>
                  {gr.grNumber} - {gr.supplierName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Return Date</Label>
          <Input
            type="date"
            value={form.returnDate}
            max={maxReturnDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, returnDate: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Supplier Ref</Label>
          <Input
            value={form.supplierRef}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, supplierRef: event.target.value }))
            }
            placeholder="Optional supplier reference"
          />
        </div>
        <div className="space-y-2">
          <Label>Internal CC Email</Label>
          <Input
            type="email"
            value={form.internalCcEmail}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, internalCcEmail: event.target.value }))
            }
            placeholder="buyer@company.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Remarks</Label>
        <Textarea
          rows={2}
          value={form.remarks}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, remarks: event.target.value }))
          }
          placeholder="Internal notes or supplier context"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Select</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">GR Qty</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead className="text-right">Return Qty</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {form.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  {goodsReceiptQuery.isLoading
                    ? 'Loading goods receipt lines...'
                    : 'Select a posted goods receipt to start a return draft.'}
                </TableCell>
              </TableRow>
            ) : (
              form.items.map((item, index) => (
                <TableRow key={item.goodsReceiptItemId}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.map((line, lineIndex) =>
                            lineIndex === index
                              ? { ...line, enabled: event.target.checked }
                              : line,
                          ),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.productCode || 'Item'}</p>
                    <p className="text-xs text-slate-500">{item.description || '—'}</p>
                  </TableCell>
                  <TableCell className="text-right">{item.grnQty}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.returnQty}
                      disabled={!item.enabled}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.map((line, lineIndex) =>
                            lineIndex === index
                              ? { ...line, returnQty: event.target.value }
                              : line,
                          ),
                        }))
                      }
                      className="w-28 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.reasonCode}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.map((line, lineIndex) =>
                            lineIndex === index
                              ? {
                                  ...line,
                                  reasonCode: value as SupplierReturnReasonCode,
                                }
                              : line,
                          ),
                        }))
                      }
                      disabled={!item.enabled}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REASON_OPTIONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {createOnly ? 'Cancel' : 'Close'}
        </Button>
        <Button
          disabled={createReturn.isPending || updateReturn.isPending}
          onClick={saveDraft}
        >
          {editingReturn ? 'Update Draft' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );

  if (createOnly) {
    return (
      <AppLayout active="Goods Returns">
        <CreatePageLayout
          title="Create Return"
          description="Select a posted goods receipt, choose the items to return, and save the draft before sending the supplier notice."
          backTo="/returns"
        >
          <Card>
            <CardContent className="pt-6">{draftForm(() => navigate('/returns'))}</CardContent>
          </Card>
        </CreatePageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="Goods Returns">
      <div className="space-y-6">
        <PageHeader title="Goods Returns" description="Return damaged or incorrect GR items to suppliers with acknowledgement tracking.">
          <Button variant="outline" onClick={handleExportReturns}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Return
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{draftCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{submittedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{doneCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Return Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return No.</TableHead>
                  <TableHead>GRN</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      No return orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">{ret.returnNumber}</TableCell>
                      <TableCell>{ret.goodsReceipt?.grNumber ?? '—'}</TableCell>
                      <TableCell>{ret.supplier?.supplierName ?? ret.supplierName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusTone(ret.status)}`}>
                          {formatReturnStatus(ret.status)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(ret.returnDate)}</TableCell>
                      <TableCell className="text-right">{formatMoney(ret.totalValue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedReturnId(ret.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ret.status === 'DRAFT' ? (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(ret)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog
          open={editorOpen && !!editingReturn}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditingReturn(null);
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Return Draft</DialogTitle>
              <DialogDescription>
                Update return lines before sending the supplier notice.
              </DialogDescription>
            </DialogHeader>
            {draftForm(() => {
              setEditorOpen(false);
              setEditingReturn(null);
            })}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedReturnId} onOpenChange={(open) => !open && setSelectedReturnId(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>{detailReturn?.returnNumber ?? 'Return Order'}</DialogTitle>
              <DialogDescription>Review return lines, upload item photos, and track when stock will actually move.</DialogDescription>
            </DialogHeader>

            {detailReturnQuery.isLoading ? (
              <p className="py-8 text-center text-slate-500">Loading return order...</p>
            ) : detailReturn ? (
              <div className="space-y-5">
                <DocumentDetailActions
                  kind="goods-return"
                  id={detailReturn.id}
                  canSend={detailReturn.status !== 'DRAFT'}
                  resend
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Supplier</p>
                    <p className="font-medium">{detailReturn.supplier?.supplierName ?? detailReturn.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Goods Receipt</p>
                    <p className="font-medium">{detailReturn.goodsReceipt?.grNumber ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusTone(detailReturn.status)}`}>
                      {formatReturnStatus(detailReturn.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-medium">{formatMoney(detailReturn.totalValue)}</p>
                  </div>
                </div>

                {detailReturn.remarks ? (
                  <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {detailReturn.remarks}
                  </div>
                ) : null}

                {returnStatusMessage(detailReturn.status) ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    {returnStatusMessage(detailReturn.status)}
                  </div>
                ) : null}

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">GR Qty</TableHead>
                        <TableHead className="text-right">Return Qty</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Images</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailReturn.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">
                              {item.product?.productCode ?? item.goodsReceiptItem?.product?.productCode ?? 'Item'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.product?.description ?? item.goodsReceiptItem?.product?.description ?? '—'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">{String(item.grnQuantity ?? item.goodsReceiptItem?.quantity ?? 0)}</TableCell>
                          <TableCell className="text-right">{String(item.quantity)}</TableCell>
                          <TableCell>{item.reasonCode ?? '—'}</TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {item.images.map((image) => (
                                  <div key={image.id} className="relative">
                                    <img
                                      src={image.publicUrl}
                                      alt={image.originalFilename}
                                      className="h-16 w-16 rounded-md border object-cover"
                                    />
                                    {detailReturn.status === 'DRAFT' ? (
                                      <button
                                        type="button"
                                        className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow"
                                        onClick={() => onDeleteImage(detailReturn.id, image.id)}
                                      >
                                        <Trash2 className="h-3 w-3 text-rose-600" />
                                      </button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              {detailReturn.status === 'DRAFT' ? (
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700">
                                  <ImagePlus className="h-3.5 w-3.5" />
                                  {uploadingItemId === item.id ? 'Uploading...' : 'Attach images'}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={(event) =>
                                      void onUploadImages(detailReturn.id, item.id, event.target.files)
                                    }
                                  />
                                </label>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {detailReturn.status === 'DRAFT' ? (
                    <>
                      <Button variant="outline" onClick={() => openEdit(detailReturn)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Draft
                      </Button>
                      <Button
                        variant="outline"
                        className="border-rose-200 text-rose-700"
                        onClick={() => void onCancelReturn(detailReturn.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        disabled={submitReturn.isPending}
                        onClick={() => void onSubmitReturn(detailReturn.id)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Submit & Send Email
                      </Button>
                    </>
                  ) : null}
                  {detailReturn.status === 'SUBMITTED' ? (
                    <>
                      <Button
                        variant="outline"
                        className="border-rose-200 text-rose-700"
                        onClick={() => void onCancelReturn(detailReturn.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        disabled={acknowledgeReturn.isPending}
                        onClick={() => void onAcknowledgeReturn(detailReturn.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {acknowledgeReturn.isPending ? 'Accepting...' : 'Accept Return'}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-slate-500">Return order not found.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default ReturnsPage;

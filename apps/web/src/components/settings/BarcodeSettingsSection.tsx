import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Edit, Printer, Search, Star, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/use-suppliers';
import {
  useBarcodeList,
  useUpdateBarcode,
  useDeleteBarcode,
  useCompanySettings,
  useUpdateCompanySetting,
} from '@/hooks/use-barcodes';
import { getApiErrorMessage } from '@/lib/api-error';

const POLICIES = [
  { id: 'AUTO_CREATE', label: 'Auto-create Product', description: 'Automatically create a draft product when scanning an unknown barcode.' },
  { id: 'ASK', label: 'Ask User / Show Form', description: 'Prompt the user to register the barcode or create a new product.' },
  { id: 'REJECT', label: 'Reject Scan', description: 'Reject the scan and notify the user that the barcode is unregistered.' },
] as const;

export function BarcodeSettingsSection() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [barcodeType, setBarcodeType] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Settings
  const { data: settings = [], isLoading: isLoadingSettings } = useCompanySettings();
  const updateSetting = useUpdateCompanySetting();
  const [selectedPolicy, setSelectedPolicy] = useState<'AUTO_CREATE' | 'ASK' | 'REJECT'>('ASK');

  // Load initial settings policy
  useEffect(() => {
    const policySetting = settings.find((s) => s.key === 'UNKNOWN_BARCODE_POLICY');
    if (policySetting && (policySetting.value === 'AUTO_CREATE' || policySetting.value === 'ASK' || policySetting.value === 'REJECT')) {
      setSelectedPolicy(policySetting.value);
    }
  }, [settings]);

  // Suppliers list for filters/dialog
  const { data: suppliers = [] } = useSuppliers();

  // Registry data
  const { data: registry, isLoading: isLoadingRegistry, refetch: refetchRegistry } = useBarcodeList({
    search: search || undefined,
    barcodeType: barcodeType === 'all' ? undefined : (barcodeType as any),
    supplierId: supplierId === 'all' ? undefined : supplierId,
    page,
    limit,
  });

  const updateBarcode = useUpdateBarcode();
  const deleteBarcode = useDeleteBarcode();

  // Dialog states
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);
  const [editingBarcode, setEditingBarcode] = useState<any>(null);
  const [deletingBarcode, setDeletingBarcode] = useState<any>(null);

  // Edit fields
  const [editType, setEditType] = useState('');
  const [editSupplierId, setEditSupplierId] = useState<string | null>('none');
  const [editIsPrimary, setEditIsPrimary] = useState(false);

  // Open Edit Dialog
  const handleEditClick = (barcode: any) => {
    setEditingBarcode(barcode);
    setEditType(barcode.barcodeType);
    setEditSupplierId(barcode.supplier?.id || 'none');
    setEditIsPrimary(barcode.isPrimary);
  };

  const savePolicy = async () => {
    setIsUpdatingPolicy(true);
    try {
      await updateSetting.mutateAsync({ key: 'UNKNOWN_BARCODE_POLICY', value: selectedPolicy });
      toast.success('Unknown barcode policy updated successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update policy'));
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  const saveEdit = async () => {
    if (!editingBarcode) return;
    try {
      await updateBarcode.mutateAsync({
        id: editingBarcode.id,
        payload: {
          barcodeType: editType,
          isPrimary: editIsPrimary,
          supplierId: editSupplierId === 'none' ? null : editSupplierId,
        },
      });
      toast.success('Barcode mapping updated successfully');
      setEditingBarcode(null);
      refetchRegistry();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update barcode mapping'));
    }
  };

  const confirmDelete = async () => {
    if (!deletingBarcode) return;
    try {
      await deleteBarcode.mutateAsync(deletingBarcode.id);
      toast.success('Barcode mapping deleted successfully');
      setDeletingBarcode(null);
      refetchRegistry();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete barcode mapping'));
    }
  };

  const handlePrint = (productId: string) => {
    navigate(`/barcode-print?productId=${productId}`);
  };

  const totalPages = registry ? Math.ceil(registry.total / limit) : 1;

  return (
    <div className="space-y-6">
      {/* ── Unknown Barcode Policy Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unknown Barcode Policy</CardTitle>
          <CardDescription>
            Configure how the system responds when an operator scans a barcode that is not registered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSettings ? (
            <div className="text-slate-500 text-sm">Loading policy settings...</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {POLICIES.map((p) => {
                  const active = selectedPolicy === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPolicy(p.id)}
                      className={cn(
                        "flex flex-col text-left p-4 rounded-xl border transition-all relative overflow-hidden",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span className="font-semibold text-sm text-slate-900 flex items-center justify-between">
                        {p.label}
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-1 text-xs text-slate-500 leading-normal">{p.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={savePolicy} disabled={isUpdatingPolicy}>
                  Save Policy
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Barcode Registry Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Barcode Registry</CardTitle>
          <CardDescription>
            Manage company-wide product barcode mappings and associate them with supplier metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search barcode or product..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-[180px]">
              <Select value={barcodeType} onValueChange={(val) => { setBarcodeType(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Barcode Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="EAN13">EAN-13</SelectItem>
                  <SelectItem value="UPC">UPC</SelectItem>
                  <SelectItem value="CODE128">Code 128</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={supplierId} onValueChange={(val) => { setSupplierId(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRegistry ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Loading registry items...
                    </TableCell>
                  </TableRow>
                ) : !registry || registry.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No barcodes found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  registry.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm font-semibold">{row.barcode}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{row.product.productCode}</TableCell>
                      <TableCell className="font-medium text-slate-900">{row.product.description}</TableCell>
                      <TableCell>
                        <Badge variant={row.barcodeType === 'INTERNAL' ? 'secondary' : 'outline'}>
                          {row.barcodeType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {row.supplier?.supplierName || <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {row.isPrimary ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(row.product.id)}
                            title="Print label"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(row)}
                            title="Edit mapping"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeletingBarcode(row)}
                            title="Delete mapping"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {registry && registry.total > limit && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, registry.total)} of {registry.total} mappings
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-slate-700 font-medium px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      <Dialog open={editingBarcode !== null} onOpenChange={(open) => !open && setEditingBarcode(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Barcode Mapping</DialogTitle>
            <DialogDescription>
              Update formatting options, primary flag, and supplier settings for this barcode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-400">Barcode Value</Label>
              <div className="font-mono font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {editingBarcode?.barcode}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-barcode-type">Barcode Format Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger id="edit-barcode-type">
                  <SelectValue placeholder="Format type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EAN13">EAN-13</SelectItem>
                  <SelectItem value="UPC">UPC</SelectItem>
                  <SelectItem value="CODE128">Code 128</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-barcode-supplier">Linked Supplier</Label>
              <Select value={editSupplierId || 'none'} onValueChange={setEditSupplierId}>
                <SelectTrigger id="edit-barcode-supplier">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Supplier linked</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-150 p-3 bg-slate-50">
              <div className="space-y-0.5">
                <Label htmlFor="edit-barcode-primary" className="text-sm font-semibold">Primary Barcode</Label>
                <p className="text-xs text-slate-500">
                  Make this the default barcode scanned for this product.
                </p>
              </div>
              <Switch
                id="edit-barcode-primary"
                checked={editIsPrimary}
                onCheckedChange={setEditIsPrimary}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBarcode(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deletingBarcode !== null} onOpenChange={(open) => !open && setDeletingBarcode(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Barcode Mapping
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mapping? The barcode will no longer resolve to this product.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 space-y-1">
            <div className="text-sm font-semibold text-slate-800">
              {deletingBarcode?.barcode}
            </div>
            <div className="text-xs text-slate-500">
              Mapped to: {deletingBarcode?.product?.description} ({deletingBarcode?.product?.productCode})
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingBarcode(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

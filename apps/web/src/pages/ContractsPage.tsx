import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { CreatePageLayout, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useShops } from '@/hooks/use-shops';
import { useSuppliers } from '@/hooks/use-suppliers';
import {
  useContracts,
  useCreateContract,
  useActivateContract,
  useUpdateContract,
  type Contract,
} from '@/hooks/use-contracts';
import { useAuthStore } from '@/store/authStore';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDateInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function firstItem(contract: Contract) {
  const item = contract.items?.[0];
  return {
    quantity: String(item?.quantity ?? 1),
    unitPrice: String(item?.unitPrice ?? 0),
  };
}

const emptyCreateForm = () => ({
  shopId: '',
  supplierId: '',
  title: '',
  startDate: '',
  endDate: '',
  quantity: '1',
  unitPrice: '0',
});

export function ContractsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: shops = [] } = useShops();
  const { data: suppliers = [] } = useSuppliers();
  const { data: contracts = [] } = useContracts();
  const createContract = useCreateContract();
  const activateContract = useActivateContract();
  const updateContract = useUpdateContract();
  const [form, setForm] = useState(emptyCreateForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState({
    shopId: '',
    supplierId: '',
    title: '',
    startDate: '',
    endDate: '',
    quantity: '1',
    unitPrice: '0',
  });

  const resolvedShopId = user?.shopId ?? form.shopId ?? shops[0]?.id ?? '';

  useEffect(() => {
    if (user?.shopId || form.shopId || shops.length === 0) return;
    setForm((prev) => ({ ...prev, shopId: shops[0].id }));
  }, [user?.shopId, form.shopId, shops]);

  const onCreate = async () => {
    if (!resolvedShopId) {
      toast.error('Please select a plant');
      return;
    }
    if (!form.supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!UUID_RE.test(form.supplierId)) {
      toast.error('Invalid supplier — pick one from the list');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error('Unit price must be 0 or greater');
      return;
    }

    try {
      await createContract.mutateAsync({
        shopId: resolvedShopId,
        supplierId: form.supplierId,
        title: form.title.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        items: [
          {
            description: form.title.trim(),
            quantity,
            unitPrice,
            uom: 'UNIT',
          },
        ],
      });
      toast.success('Contract created successfully');
      if (createOnly) {
        navigate('/contracts');
      } else {
        setForm({
          shopId: user?.shopId ? form.shopId : resolvedShopId,
          supplierId: '',
          title: '',
          startDate: '',
          endDate: '',
          quantity: '1',
          unitPrice: '0',
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to create contract';
      toast.error(msg);
    }
  };

  function openEdit(contract: Contract) {
    const line = firstItem(contract);
    setEditing(contract);
    setEditForm({
      shopId: contract.shopId ?? user?.shopId ?? '',
      supplierId: contract.supplierId ?? contract.supplier?.id ?? '',
      title: contract.title,
      startDate: formatDateInput(contract.startDate),
      endDate: formatDateInput(contract.endDate),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    });
    setEditOpen(true);
  }

  const onSaveEdit = async () => {
    if (!editing) return;
    if (!editForm.supplierId || !UUID_RE.test(editForm.supplierId)) {
      toast.error('Please select a valid supplier');
      return;
    }
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const quantity = Number(editForm.quantity);
    const unitPrice = Number(editForm.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      await updateContract.mutateAsync({
        id: editing.id,
        shopId: editForm.shopId || undefined,
        supplierId: editForm.supplierId,
        title: editForm.title.trim(),
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        items: [
          {
            description: editForm.title.trim(),
            quantity,
            unitPrice,
            uom: 'UNIT',
          },
        ],
      });
      toast.success('Contract updated');
      setEditOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to update contract';
      toast.error(msg);
    }
  };

  const editShopId = user?.shopId ?? editForm.shopId ?? shops[0]?.id ?? '';

  const createForm = (
    <Card>
      <CardHeader>
        <CardTitle>Contract Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {!user?.shopId && (
          <div className="space-y-2 md:col-span-2">
            <Label>Plant *</Label>
            <Select
              value={form.shopId || resolvedShopId}
              onValueChange={(value) => setForm((p) => ({ ...p, shopId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.shopName} ({shop.shopNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Supplier *</Label>
          <Select
            value={form.supplierId}
            onValueChange={(value) => setForm((p) => ({ ...p, supplierId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.supplierName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Quantity *</Label>
          <Input
            type="number"
            min="0.0001"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit Price *</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={form.unitPrice}
            onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Button onClick={onCreate} disabled={createContract.isPending}>
            {createContract.isPending ? 'Saving...' : 'Create Contract'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (createOnly) {
    return (
      <AppLayout active="Contracts">
        <CreatePageLayout
          title="Create Contract"
          description="Create and activate supplier contracts."
          backTo="/contracts"
        >
          {createForm}
        </CreatePageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="Contracts">
      <div className="space-y-6">
        <PageHeader title="Contracts" description="Create and activate supplier contracts.">
          <Button onClick={() => navigate('/contracts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Contract
          </Button>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Contract List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract No</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No contracts found.</TableCell>
                  </TableRow>
                ) : (
                  contracts.map((c) => {
                    const isDraft = c.status === 'DRAFT';
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{c.contractNumber}</TableCell>
                        <TableCell>{c.title}</TableCell>
                        <TableCell>{c.supplier?.supplierName ?? '—'}</TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isDraft && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(c)}
                                disabled={updateContract.isPending}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}
                            {isDraft && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={activateContract.isPending}
                                onClick={async () => {
                                  try {
                                    await activateContract.mutateAsync(c.id);
                                    toast.success('Contract activated');
                                  } catch (err: unknown) {
                                    const msg =
                                      (
                                        err as {
                                          response?: { data?: { error?: { message?: string } } };
                                        }
                                      ).response?.data?.error?.message ?? 'Failed to activate contract';
                                    toast.error(msg);
                                  }
                                }}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Contract</SheetTitle>
            <SheetDescription>
              {editing?.contractNumber} — draft contracts can be updated before activation.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            {!user?.shopId && (
              <div className="space-y-2">
                <Label>Plant</Label>
                <Select
                  value={editForm.shopId || editShopId}
                  onValueChange={(value) => setEditForm((p) => ({ ...p, shopId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.shopName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select
                value={editForm.supplierId}
                onValueChange={(value) => setEditForm((p) => ({ ...p, supplierId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm((p) => ({ ...p, unitPrice: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={onSaveEdit} disabled={updateContract.isPending}>
              {updateContract.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

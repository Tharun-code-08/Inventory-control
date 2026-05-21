import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useShops, useCreateShop, useUpdateShop, useDeleteShop, type Shop } from '@/hooks/use-shops';
import { useCreateStorageLocation, useStorageLocations } from '@/hooks/use-storage-locations';

export function PlantsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const { data: plants = [] } = useShops();
  const createPlant = useCreateShop();
  const updatePlant = useUpdateShop();
  const deletePlant = useDeleteShop();
  const createStorageLocation = useCreateStorageLocation();
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Shop | null>(null);
  const [form, setForm] = useState({
    shopNumber: '',
    shopName: '',
    taxId: '',
    address: '',
    contactPerson: '',
    mobile: '',
    email: '',
  });
  const [storageLocations, setStorageLocations] = useState([{ code: '', name: '', description: '' }]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const { data: existingLocations = [] } = useStorageLocations(selectedPlantId || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setForm({
      shopNumber: '',
      shopName: '',
      taxId: '',
      address: '',
      contactPerson: '',
      mobile: '',
      email: '',
    });
    setStorageLocations([{ code: '', name: '', description: '' }]);
    setEditingPlantId(null);
  };

  const onEditStart = (plant: Shop) => {
    setEditingPlantId(plant.id);
    setForm({
      shopNumber: plant.shopNumber ?? '',
      shopName: plant.shopName ?? '',
      taxId: plant.taxId ?? '',
      address: plant.address ?? '',
      contactPerson: plant.contactPerson ?? '',
      mobile: plant.mobile ?? '',
      email: plant.email ?? '',
    });
    // Storage locations are only created during new plant creation.
    setStorageLocations([{ code: '', name: '', description: '' }]);
    // Bring the form into view and focus the first field so the user
    // sees the page has switched into edit mode.
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      firstFieldRef.current?.focus({ preventScroll: true });
    });
  };

  const handleToggleActive = async (plant: Shop, nextActive: boolean) => {
    try {
      await updatePlant.mutateAsync({ id: plant.id, isActive: nextActive });
      toast.success(`${plant.shopName} ${nextActive ? 'activated' : 'deactivated'}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to update plant status';
      toast.error(msg);
    } finally {
      setDeactivateTarget(null);
    }
  };

  const onToggleStatusClick = (plant: Shop) => {
    if (plant.isActive) {
      setDeactivateTarget(plant);
    } else {
      handleToggleActive(plant, true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePlant.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.shopName} deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to delete plant';
      toast.error(msg);
    }
  };

  const onCreate = async () => {
    if (!form.shopNumber.trim()) {
      toast.error('Plant code is required');
      return;
    }
    if (!form.shopName.trim()) {
      toast.error('Plant name is required');
      return;
    }
    if (!form.contactPerson.trim() || !form.mobile.trim() || !form.email.trim() || !form.address.trim()) {
      toast.error('Fill all required plant fields');
      return;
    }

    const validLocations = storageLocations.filter((row) => row.code.trim() && row.name.trim());
    const hasInvalidLocation = storageLocations.some(
      (row) => (row.code.trim() && !row.name.trim()) || (!row.code.trim() && row.name.trim()),
    );
    if (hasInvalidLocation) {
      toast.error('Each storage location must include both code and name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPlantId) {
        await updatePlant.mutateAsync({
          id: editingPlantId,
          ...form,
          taxId: form.taxId || undefined,
        });
        resetForm();
        toast.success('Plant updated successfully');
        return;
      }

      const created = await createPlant.mutateAsync({
        ...form,
        taxId: form.taxId || undefined,
      });

      for (const location of validLocations) {
        await createStorageLocation.mutateAsync({
          shopId: created.id,
          code: location.code,
          name: location.name,
          description: location.description || undefined,
          isActive: true,
        });
      }

      resetForm();
      toast.success('Plant created successfully');
    } catch (err: unknown) {
      const fallback = editingPlantId ? 'Failed to update plant' : 'Failed to create plant';
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        fallback;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout active="Plants">
      <div className={createOnly ? 'create-page-shell space-y-6 p-4 sm:p-6' : 'space-y-6'}>
        <PageHeader
          title={createOnly ? 'Create Plant' : editingPlantId ? 'Edit Plant' : 'Plants'}
          description={
            createOnly
              ? 'Fill in details to create a new plant'
              : editingPlantId
                ? 'Update plant details below, then click Update Plant to save.'
                : 'Plant setup with contact and location details.'
          }
        >
          {createOnly ? (
            <Button variant="outline" onClick={() => navigate('/plants')} className="w-full sm:w-auto">Back</Button>
          ) : (
            <Button className="premium-button border-0 text-white" onClick={() => navigate('/plants/new')}>Add Plant</Button>
          )}
        </PageHeader>
        <Card ref={formCardRef}>
          <CardHeader>
            <CardTitle>{editingPlantId ? 'Edit Plant' : 'Create Plant'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plant Code *</Label>
                <Input ref={firstFieldRef} value={form.shopNumber} onChange={(e) => setForm((p) => ({ ...p, shopNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Plant Name *</Label>
                <Input value={form.shopName} onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tax ID</Label>
                <Input value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person *</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address *</Label>
                <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Storage Locations (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStorageLocations((prev) => [...prev, { code: '', name: '', description: '' }])}
                >
                  Add Location
                </Button>
              </div>
              {storageLocations.map((location, index) => (
                <div key={index} className="grid gap-3 lg:grid-cols-3">
                  <Input
                    placeholder="Code"
                    value={location.code}
                    onChange={(e) =>
                      setStorageLocations((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, code: e.target.value } : row)),
                      )
                    }
                  />
                  <Input
                    placeholder="Name"
                    value={location.name}
                    onChange={(e) =>
                      setStorageLocations((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                      )
                    }
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Description"
                      value={location.description}
                      onChange={(e) =>
                        setStorageLocations((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)),
                        )
                      }
                    />
                    {storageLocations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => setStorageLocations((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={onCreate} disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? 'Saving...' : editingPlantId ? 'Update Plant' : 'Create Plant'}
              </Button>
              {editingPlantId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} className="w-full sm:w-auto">
                  Cancel Edit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {!createOnly && <Card>
          <CardHeader><CardTitle>Plant List</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {plants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plants found.</p>
              ) : (
                plants.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      'rounded-xl border p-3',
                      editingPlantId === p.id
                        ? 'border-emerald-400/60 bg-emerald-500/10'
                        : 'border-white/10 bg-slate-900/50',
                      !p.isActive && 'opacity-70',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.shopName}</p>
                        <p className="text-xs text-muted-foreground">{p.shopNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{p.isActive ? 'Active' : 'Inactive'}</span>
                        <Switch
                          checked={p.isActive}
                          onCheckedChange={() => onToggleStatusClick(p)}
                          aria-label="Toggle plant status"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Contact: {p.contactPerson || '-'}</p>
                      <p>Phone: {p.mobile || '-'}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={editingPlantId === p.id ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => onEditStart(p)}
                      >
                        {editingPlantId === p.id ? 'Editing…' : 'Edit'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                        aria-label="Delete plant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {plants.map((p) => (
                    <TableRow
                      key={p.id}
                      className={cn(
                        editingPlantId === p.id && 'bg-emerald-500/10',
                        !p.isActive && 'opacity-70',
                      )}
                    >
                      <TableCell>{p.shopNumber}</TableCell>
                      <TableCell>{p.shopName}</TableCell>
                      <TableCell>{p.contactPerson}</TableCell>
                      <TableCell>{p.mobile}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.isActive}
                            onCheckedChange={() => onToggleStatusClick(p)}
                            aria-label="Toggle plant status"
                          />
                          <span className="text-xs text-muted-foreground">
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={editingPlantId === p.id ? 'default' : 'outline'}
                            onClick={() => onEditStart(p)}
                          >
                            {editingPlantId === p.id ? 'Editing…' : 'Edit'}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                            aria-label="Delete plant"
                            title="Delete plant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>}
        {!createOnly && <Card>
          <CardHeader><CardTitle>Storage Locations (Integrated with Plants)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Select Plant</Label>
              <Input list="plant-list" value={selectedPlantId} onChange={(e) => setSelectedPlantId(e.target.value)} placeholder="Choose plant ID" />
              <datalist id="plant-list">
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.shopName}</option>
                ))}
              </datalist>
            </div>
            <div className="space-y-3 md:hidden">
              {existingLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No storage locations found for selected plant.</p>
              ) : (
                existingLocations.map((loc) => (
                  <div key={loc.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-xs text-muted-foreground">{loc.code}</p>
                      </div>
                      <span className="text-xs">{loc.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{loc.description ?? '-'}</p>
                  </div>
                ))
              )}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {existingLocations.length === 0 ? (
                    <TableRow><TableCell colSpan={4}>No storage locations found for selected plant.</TableCell></TableRow>
                  ) : (
                    existingLocations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell>{loc.code}</TableCell>
                        <TableCell>{loc.name}</TableCell>
                        <TableCell>{loc.description ?? '-'}</TableCell>
                        <TableCell>{loc.isActive ? 'Active' : 'Inactive'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plant</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.shopName}
              </span>
              ? Plants with product assignments, users, storage locations, or any
              transaction history can't be deleted — deactivate them instead to
              keep their history intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePlant.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              disabled={deletePlant.isPending}
              onClick={handleDelete}
            >
              {deletePlant.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate plant</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate{' '}
              <span className="font-medium text-foreground">
                {deactivateTarget?.shopName}
              </span>
              ? It will be hidden from new transactions and product assignments
              but kept in reports and history. You can reactivate it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatePlant.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              disabled={updatePlant.isPending}
              onClick={() => deactivateTarget && handleToggleActive(deactivateTarget, false)}
            >
              {updatePlant.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Factory,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import {
  useCreateStorageLocation,
  useStorageLocations,
  type StorageLocation,
} from '@/hooks/use-storage-locations';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/store/authStore';

type PlantFormState = {
  shopNumber: string;
  shopName: string;
  taxId: string;
  address: string;
  contactPerson: string;
  mobile: string;
  email: string;
};

type LocationDraft = { code: string; name: string; description: string };

const CREATE_NEW_STORAGE_CODE = '__create_new__';
const PLANT_CODE_PATTERN = /^[A-Z0-9_-]{3,20}$/;

function normalizePlantCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function validatePlantCode(value: string): string | null {
  const code = normalizePlantCode(value);
  if (!code) return 'Plant code is required';
  if (!PLANT_CODE_PATTERN.test(code)) {
    return 'Plant code must be 3–20 characters using letters, numbers, hyphens, or underscores only (e.g. HQ-002)';
  }
  return null;
}

const emptyForm = (): PlantFormState => ({
  shopNumber: '',
  shopName: '',
  taxId: '',
  address: '',
  contactPerson: '',
  mobile: '',
  email: '',
});

type KpiCardProps = {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function PlantStatusBadge({ active }: { active: boolean }) {
  if (!active) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        Inactive
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      Active
    </span>
  );
}

type PlantFormFieldsProps = {
  form: PlantFormState;
  setForm: React.Dispatch<React.SetStateAction<PlantFormState>>;
  storageLocations: LocationDraft[];
  setStorageLocations: React.Dispatch<React.SetStateAction<LocationDraft[]>>;
  showStorageLocations: boolean;
  existingStorageCodes: string[];
  firstFieldRef?: React.RefObject<HTMLInputElement | null>;
};

function PlantFormFields({
  form,
  setForm,
  storageLocations,
  setStorageLocations,
  showStorageLocations,
  existingStorageCodes,
  firstFieldRef,
}: PlantFormFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Plant Code *</Label>
          <Input
            ref={firstFieldRef}
            value={form.shopNumber}
            placeholder="HQ-002"
            onChange={(e) => setForm((p) => ({ ...p, shopNumber: e.target.value }))}
            onBlur={() =>
              setForm((p) => ({
                ...p,
                shopNumber: p.shopNumber ? normalizePlantCode(p.shopNumber) : p.shopNumber,
              }))
            }
          />
          <p className="text-xs text-slate-500">
            Letters, numbers, hyphens, and underscores only. Spaces are removed automatically.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Plant Name *</Label>
          <Input
            value={form.shopName}
            onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Tax ID</Label>
          <Input value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Contact Person *</Label>
          <Input
            value={form.contactPerson}
            onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
          />
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

      {showStorageLocations && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <Label>Storage Locations (optional)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setStorageLocations((prev) => [...prev, { code: '', name: '', description: '' }])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Location
            </Button>
          </div>
          {storageLocations.map((location, index) => {
            const normalizedCode = location.code.trim().toUpperCase();
            const matchesExisting = existingStorageCodes.includes(normalizedCode);
            const selectValue =
              !normalizedCode || !matchesExisting ? CREATE_NEW_STORAGE_CODE : normalizedCode;

            return (
            <div key={index} className="grid gap-3 lg:grid-cols-3">
              <div className="space-y-2">
                <Select
                  value={selectValue}
                  onValueChange={(value) => {
                    if (value === CREATE_NEW_STORAGE_CODE) {
                      setStorageLocations((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, code: '' } : row)),
                      );
                      return;
                    }
                    setStorageLocations((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, code: value, name: row.name || value } : row,
                      ),
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Storage code" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingStorageCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                    <SelectItem value={CREATE_NEW_STORAGE_CODE}>Create new…</SelectItem>
                  </SelectContent>
                </Select>
                {selectValue === CREATE_NEW_STORAGE_CODE && (
                  <Input
                    placeholder="New code"
                    value={location.code}
                    onChange={(e) =>
                      setStorageLocations((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, code: e.target.value.toUpperCase() } : row,
                        ),
                      )
                    }
                  />
                )}
              </div>
              <Input
                placeholder="Name"
                value={location.name}
                onChange={(e) =>
                  setStorageLocations((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                  )
                }
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Description"
                  value={location.description}
                  onChange={(e) =>
                    setStorageLocations((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, description: e.target.value } : row,
                      ),
                    )
                  }
                />
                {storageLocations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 text-destructive"
                    onClick={() => setStorageLocations((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type PlantCardProps = {
  plant: Shop;
  locations: StorageLocation[];
  onEdit: () => void;
  onDelete: () => void;
};

function PlantCard({ plant, locations, onEdit, onDelete }: PlantCardProps) {
  const activeLocations = locations.filter((l) => l.isActive);

  return (
    <Card className="flex flex-col border-slate-200/90 shadow-sm">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
              <Warehouse className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{plant.shopName}</p>
              <span className="mt-1 inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                {plant.shopNumber}
              </span>
            </div>
          </div>
          <PlantStatusBadge active={plant.isActive} />
        </div>

        <div className="mt-4 space-y-1 text-sm text-slate-600">
          {plant.contactPerson ? <p className="font-medium text-slate-700">{plant.contactPerson}</p> : null}
          <p className="leading-relaxed">{plant.address}</p>
          {(plant.mobile || plant.email) && (
            <p className="text-xs text-slate-500">
              {[plant.mobile, plant.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="mt-4 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Storage Locations ({activeLocations.length})
          </p>
          {activeLocations.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No storage locations yet</p>
          ) : (
            <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto">
              {activeLocations.map((loc) => (
                <li key={loc.id} className="flex gap-2 text-sm">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {loc.code} — {loc.name}
                    </p>
                    {loc.description ? (
                      <p className="text-xs text-slate-500">{loc.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            aria-label="Edit plant"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Delete plant"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlantsListView() {
  const navigate = useNavigate();
  const { data: plants = [], isLoading: plantsLoading } = useShops();
  const { data: allLocations = [], isLoading: locationsLoading } = useStorageLocations();
  const updatePlant = useUpdateShop();
  const deletePlant = useDeleteShop();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Shop | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Shop | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [storageLocations, setStorageLocations] = useState<LocationDraft[]>([
    { code: '', name: '', description: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const locationsByShop = useMemo(() => {
    const map = new Map<string, StorageLocation[]>();
    for (const loc of allLocations) {
      const list = map.get(loc.shopId) ?? [];
      list.push(loc);
      map.set(loc.shopId, list);
    }
    return map;
  }, [allLocations]);

  const existingStorageCodes = useMemo(
    () =>
      [...new Set(allLocations.map((loc) => loc.code.trim().toUpperCase()).filter(Boolean))].sort(),
    [allLocations],
  );

  const stats = useMemo(() => {
    const total = plants.length;
    const active = plants.filter((p) => p.isActive).length;
    const storageLocations = allLocations.filter((l) => l.isActive).length;
    return { total, active, storageLocations };
  }, [plants, allLocations]);

  const resetForm = () => {
    setForm(emptyForm());
    setStorageLocations([{ code: '', name: '', description: '' }]);
    setEditingPlant(null);
  };

  const openEdit = (plant: Shop) => {
    setEditingPlant(plant);
    setForm({
      shopNumber: plant.shopNumber ?? '',
      shopName: plant.shopName ?? '',
      taxId: plant.taxId ?? '',
      address: plant.address ?? '',
      contactPerson: plant.contactPerson ?? '',
      mobile: plant.mobile ?? '',
      email: plant.email ?? '',
    });
    setSheetOpen(true);
  };

  const handleToggleActive = async (plant: Shop, nextActive: boolean) => {
    try {
      await updatePlant.mutateAsync({ id: plant.id, isActive: nextActive });
      toast.success(`${plant.shopName} ${nextActive ? 'activated' : 'deactivated'}`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update plant status'));
    } finally {
      setDeactivateTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePlant.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.shopName} deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete plant'));
    }
  };

  const onSave = async () => {
    const plantCodeError = validatePlantCode(form.shopNumber);
    if (plantCodeError) {
      toast.error(plantCodeError);
      return;
    }
    const shopNumber = normalizePlantCode(form.shopNumber);
    if (!form.shopName.trim()) {
      toast.error('Plant name is required');
      return;
    }
    if (!form.contactPerson.trim() || !form.mobile.trim() || !form.email.trim() || !form.address.trim()) {
      toast.error('Fill all required plant fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePlant.mutateAsync({
        id: editingPlant!.id,
        ...form,
        shopNumber,
        taxId: form.taxId || undefined,
      });
      toast.success('Plant updated successfully');
      setSheetOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update plant'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = plantsLoading || locationsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plants & Warehouses"
        description="Manage storage locations and facilities"
      >
        <Button onClick={() => navigate('/plants/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plant
        </Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Total Plants"
          value={stats.total}
          accent="bg-primary"
          icon={<Factory className="h-5 w-5 text-primary" />}
        />
        <KpiCard
          label="Active"
          value={stats.active}
          accent="bg-emerald-500"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <KpiCard
          label="Storage Locations"
          value={stats.storageLocations}
          accent="bg-sky-500"
          icon={<MapPin className="h-5 w-5 text-sky-600" />}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : plants.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Warehouse className="mb-3 h-12 w-12 text-slate-300" />
            <p className="font-medium text-slate-700">No plants yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your first plant and storage locations.</p>
            <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate('/plants/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              locations={locationsByShop.get(plant.id) ?? []}
              onEdit={() => openEdit(plant)}
              onDelete={() => setDeleteTarget(plant)}
            />
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) resetForm();
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Plant</SheetTitle>
            <SheetDescription>
              Update details for {editingPlant?.shopName ?? 'this plant'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <PlantFormFields
              form={form}
              setForm={setForm}
              storageLocations={storageLocations}
              setStorageLocations={setStorageLocations}
              showStorageLocations={false}
              existingStorageCodes={existingStorageCodes}
              firstFieldRef={firstFieldRef}
            />
            {editingPlant && !editingPlant.isActive && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleToggleActive(editingPlant, true)}
              >
                Activate plant
              </Button>
            )}
            {editingPlant?.isActive && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  setSheetOpen(false);
                  setDeactivateTarget(editingPlant);
                }}
              >
                Deactivate plant
              </Button>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSheetOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={onSave} disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Update Plant'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plant</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.shopName}</span>? Plants with
              product assignments, users, storage locations, or transaction history cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePlant.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePlant.isPending}
              onClick={handleDelete}
            >
              {deletePlant.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate plant</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate{' '}
              <span className="font-medium text-foreground">{deactivateTarget?.shopName}</span>? It will be
              hidden from new transactions but kept in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatePlant.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updatePlant.isPending}
              onClick={() => deactivateTarget && handleToggleActive(deactivateTarget, false)}
            >
              {updatePlant.isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlantsCreateView() {
  const navigate = useNavigate();
  const companyId = useAuthStore((s) => s.user?.companyId ?? undefined);
  const createPlant = useCreateShop();
  const createStorageLocation = useCreateStorageLocation();
  const { data: plants = [] } = useShops();
  const { data: allLocations = [] } = useStorageLocations();
  const existingStorageCodes = useMemo(
    () =>
      [...new Set(allLocations.map((loc) => loc.code.trim().toUpperCase()).filter(Boolean))].sort(),
    [allLocations],
  );
  const [form, setForm] = useState(emptyForm());
  const [storageLocations, setStorageLocations] = useState<LocationDraft[]>([
    { code: '', name: '', description: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const onCreate = async () => {
    const plantCodeError = validatePlantCode(form.shopNumber);
    if (plantCodeError) {
      toast.error(plantCodeError);
      return;
    }
    const shopNumber = normalizePlantCode(form.shopNumber);
    const duplicate = plants.find((p) => p.shopNumber.toUpperCase() === shopNumber);
    if (duplicate) {
      toast.error(
        `Plant code "${shopNumber}" is already used by "${duplicate.shopName}". Choose a different code or edit the existing plant.`,
      );
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

    const validLocations = storageLocations
      .filter((row) => row.code.trim() && row.name.trim())
      .map((row) => ({
        ...row,
        code: row.code.trim().toUpperCase(),
        name: row.name.trim(),
        description: row.description.trim(),
      }));
    const hasInvalidLocation = storageLocations.some(
      (row) => (row.code.trim() && !row.name.trim()) || (!row.code.trim() && row.name.trim()),
    );
    if (hasInvalidLocation) {
      toast.error('Each storage location must include both code and name');
      return;
    }
    const locationCodes = validLocations.map((row) => row.code);
    if (new Set(locationCodes).size !== locationCodes.length) {
      toast.error('Each storage location code must be unique within this plant');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPlant.mutateAsync({
        ...form,
        shopNumber,
        companyId,
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

      toast.success('Plant created successfully');
      navigate('/plants');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create plant'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-page-shell space-y-6 p-4 sm:p-6">
      <PageHeader title="Add Plant" description="Create a plant and optional storage locations">
        <Button variant="outline" onClick={() => navigate('/plants')}>
          Back
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Plant details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PlantFormFields
            form={form}
            setForm={setForm}
            storageLocations={storageLocations}
            setStorageLocations={setStorageLocations}
            showStorageLocations
            existingStorageCodes={existingStorageCodes}
            firstFieldRef={firstFieldRef}
          />
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={onCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Create Plant'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlantsPage({ createOnly = false }: { createOnly?: boolean }) {
  return (
    <AppLayout active="Plants">
      {createOnly ? <PlantsCreateView /> : <PlantsListView />}
    </AppLayout>
  );
}

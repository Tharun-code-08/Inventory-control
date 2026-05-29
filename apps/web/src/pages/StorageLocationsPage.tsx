import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { CreatePageLayout, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useShops } from '@/hooks/use-shops';
import {
  useStorageLocations,
  useCreateStorageLocation,
  useDeleteStorageLocation,
  useUpdateStorageLocation,
} from '@/hooks/use-storage-locations';
import { cn } from '@/lib/cn';

type StorageLocationForm = {
  code: string;
  name: string;
  description: string;
};

const emptyForm = (): StorageLocationForm => ({
  code: '',
  name: '',
  description: '',
});

type StorageLocationFormFieldsProps = {
  shopId: string;
  onShopIdChange: (value: string) => void;
  shops: Array<{ id: string; shopName: string }>;
  form: StorageLocationForm;
  setForm: React.Dispatch<React.SetStateAction<StorageLocationForm>>;
};

function StorageLocationFormFields({
  shopId,
  onShopIdChange,
  shops,
  form,
  setForm,
}: StorageLocationFormFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Plant *</Label>
        <Select value={shopId} onValueChange={onShopIdChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select plant" />
          </SelectTrigger>
          <SelectContent>
            {shops.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.shopName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Code *</Label>
        <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
      </div>
    </div>
  );
}

function StorageLocationsCreateView() {
  const navigate = useNavigate();
  const { data: shops = [] } = useShops();
  const createLocation = useCreateStorageLocation();
  const [shopId, setShopId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onCreate = async () => {
    if (!shopId) {
      toast.error('Select a plant before adding a storage location');
      return;
    }
    if (!form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLocation.mutateAsync({
        shopId,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isActive: true,
      });
      toast.success('Storage location added');
      navigate('/storage-locations');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to add storage location';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CreatePageLayout
      title="Add Storage Location"
      description="Create a storage area or bin for a plant"
      backTo="/storage-locations"
    >
      <Card>
        <CardHeader>
          <CardTitle>Location details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <StorageLocationFormFields
            shopId={shopId}
            onShopIdChange={setShopId}
            shops={shops}
            form={form}
            setForm={setForm}
          />
          <Button onClick={onCreate} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Add Location'}
          </Button>
        </CardContent>
      </Card>
    </CreatePageLayout>
  );
}

function StorageLocationsListView() {
  const navigate = useNavigate();
  const { data: shops = [] } = useShops();
  const [shopId, setShopId] = useState<string>('');
  const { data: rows = [] } = useStorageLocations(shopId || undefined);
  const deactivateLocation = useDeleteStorageLocation();
  const updateLocation = useUpdateStorageLocation();
  const actionPending = deactivateLocation.isPending || updateLocation.isPending;

  const onDeactivate = async (id: string) => {
    try {
      await deactivateLocation.mutateAsync(id);
      toast.success('Storage location deactivated');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to deactivate location';
      toast.error(msg);
    }
  };

  const onActivate = async (id: string) => {
    try {
      await updateLocation.mutateAsync({ id, isActive: true });
      toast.success('Storage location activated');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to activate location';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Storage Locations" description="Manage plant-wise storage areas and bins.">
        <Button onClick={() => navigate('/storage-locations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Location List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-2">
            <Label>Filter by plant</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shopName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No locations found.</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.description || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.isActive ? 'Active' : 'Deactive'} />
                    </TableCell>
                    <TableCell>
                      {r.isActive ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeactivate(r.id)}
                          disabled={actionPending}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900',
                          )}
                          onClick={() => onActivate(r.id)}
                          disabled={actionPending}
                        >
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function StorageLocationsPage({ createOnly = false }: { createOnly?: boolean }) {
  return (
    <AppLayout active="Storage Locations">
      {createOnly ? <StorageLocationsCreateView /> : <StorageLocationsListView />}
    </AppLayout>
  );
}

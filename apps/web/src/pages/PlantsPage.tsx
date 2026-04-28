import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useShops, useCreateShop } from '@/hooks/use-shops';
import { useCreateStorageLocation, useStorageLocations } from '@/hooks/use-storage-locations';

export function PlantsPage() {
  const { data: plants = [] } = useShops();
  const createPlant = useCreateShop();
  const createStorageLocation = useCreateStorageLocation();
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
  const { data: existingLocations = [] } = useStorageLocations(selectedPlantId || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.success('Plant created successfully');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to create plant';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout active="Plants">
      <div className="space-y-6">
        <PageHeader title="Plants" description="Plant setup with contact and location details." />
        <Card>
          <CardHeader>
            <CardTitle>Create Plant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plant Code *</Label>
                <Input value={form.shopNumber} onChange={(e) => setForm((p) => ({ ...p, shopNumber: e.target.value }))} />
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
                <div key={index} className="grid gap-3 md:grid-cols-3">
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
                  <div className="flex gap-2">
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
                        onClick={() => setStorageLocations((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={onCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Plant'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Plant List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {plants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.shopNumber}</TableCell>
                    <TableCell>{p.shopName}</TableCell>
                    <TableCell>{p.contactPerson}</TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.isActive ? 'Active' : 'Inactive'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

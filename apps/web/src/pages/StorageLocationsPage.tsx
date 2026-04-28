import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations, useCreateStorageLocation, useDeleteStorageLocation } from '@/hooks/use-storage-locations';

export function StorageLocationsPage() {
  const { data: shops = [] } = useShops();
  const [shopId, setShopId] = useState<string>('');
  const { data: rows = [] } = useStorageLocations(shopId || undefined);
  const createLocation = useCreateStorageLocation();
  const deleteLocation = useDeleteStorageLocation();
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  const onCreate = async () => {
    if (!shopId || !form.code.trim() || !form.name.trim()) return;
    await createLocation.mutateAsync({ ...form, shopId, isActive: true });
    setForm({ code: '', name: '', description: '' });
  };

  return (
    <AppLayout active="Storage Locations">
      <div className="space-y-6">
        <PageHeader title="Storage Locations" description="Manage plant-wise storage areas and bins." />
        <Card>
          <CardHeader><CardTitle>Add Storage Location</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Plant</Label>
              <Select value={shopId} onValueChange={setShopId}>
                <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                <SelectContent>
                  {shops.map((s) => <SelectItem key={s.id} value={s.id}>{s.shopName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="md:col-span-2"><Button onClick={onCreate}>Add Location</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Location List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? <TableRow><TableCell colSpan={5}>No locations found.</TableCell></TableRow> : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.description || '-'}</TableCell>
                    <TableCell>{r.isActive ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => deleteLocation.mutate(r.id)}>Deactivate</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

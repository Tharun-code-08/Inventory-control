import { useState, type Dispatch, type SetStateAction } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  type Supplier,
  type CreateSupplierPayload,
} from '@/hooks/use-suppliers';
import { useCompanies } from '@/hooks/use-companies';

type SupplierFormState = {
  companyId: string;
  supplierCode: string;
  supplierName: string;
  taxId: string;
  vatNumber: string;
  categories: string;
  contactPerson: string;
  email: string;
  phone: string;
  street: string;
  paymentTerms: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  iban: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  rating: number;
};

const emptyForm = (): SupplierFormState => ({
  companyId: '',
  supplierCode: '',
  supplierName: '',
  taxId: '',
  vatNumber: '',
  categories: '',
  contactPerson: '',
  email: '',
  phone: '',
  street: '',
  paymentTerms: 'Net 30',
  bankName: '',
  accountNumber: '',
  routingNumber: '',
  iban: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  rating: 3,
});

function formFromSupplier(s: Supplier): SupplierFormState {
  return {
    companyId: s.companyId ?? '',
    supplierCode: s.supplierCode ?? '',
    supplierName: s.supplierName ?? '',
    taxId: s.taxId ?? '',
    vatNumber: s.vatNumber ?? '',
    categories: (s.categories ?? []).join(', '),
    contactPerson: s.contactPerson ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    street: s.street ?? '',
    paymentTerms: s.paymentTerms ?? 'Net 30',
    bankName: s.bankName ?? '',
    accountNumber: s.accountNumber ?? '',
    routingNumber: s.routingNumber ?? '',
    iban: s.iban ?? '',
    city: s.city ?? '',
    state: s.state ?? '',
    postalCode: s.postalCode ?? '',
    country: s.country ?? '',
    rating: s.rating ?? 3,
  };
}

function formToPayload(form: SupplierFormState): CreateSupplierPayload {
  return {
    companyId: form.companyId || undefined,
    supplierCode: form.supplierCode || undefined,
    supplierName: form.supplierName,
    taxId: form.taxId || undefined,
    vatNumber: form.vatNumber || undefined,
    rating: form.rating,
    categories: form.categories
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    contactPerson: form.contactPerson,
    email: form.email,
    phone: form.phone,
    street: form.street || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    postalCode: form.postalCode || undefined,
    country: form.country || undefined,
    paymentTerms: form.paymentTerms || undefined,
    bankName: form.bankName || undefined,
    accountNumber: form.accountNumber || undefined,
    routingNumber: form.routingNumber || undefined,
    iban: form.iban || undefined,
    isActive: true,
  };
}

function SupplierFormFields({
  form,
  setForm,
  companies,
  codeHint,
}: {
  form: SupplierFormState;
  setForm: Dispatch<SetStateAction<SupplierFormState>>;
  companies: Array<{ id: string; companyName: string }>;
  codeHint?: string;
}) {
  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Company Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select
              value={form.companyId || '__none__'}
              onValueChange={(v) => setForm((p) => ({ ...p, companyId: v === '__none__' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Supplier Name *</Label>
            <Input
              value={form.supplierName}
              onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Supplier Code</Label>
            <Input
              value={form.supplierCode}
              onChange={(e) => setForm((p) => ({ ...p, supplierCode: e.target.value }))}
              placeholder={codeHint ?? 'Auto-generated if empty'}
            />
          </div>
          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>VAT Number</Label>
            <Input value={form.vatNumber} onChange={(e) => setForm((p) => ({ ...p, vatNumber: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Supply Categories (comma separated)</Label>
            <Input
              value={form.categories}
              onChange={(e) => setForm((p) => ({ ...p, categories: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Contact Details</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Contact Person *</Label>
            <Input
              value={form.contactPerson}
              onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Address</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Street Address</Label>
            <Input value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>State / Province</Label>
            <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>ZIP / Postal Code</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Payment & Banking</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Input
              value={form.paymentTerms}
              onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Routing Number / SWIFT</Label>
            <Input
              value={form.routingNumber}
              onChange={(e) => setForm((p) => ({ ...p, routingNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>IBAN</Label>
            <Input value={form.iban} onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))} />
          </div>
        </div>
      </div>
    </>
  );
}

export function SuppliersPage() {
  const [search, setSearch] = useState('');
  const { data: suppliers = [], isLoading } = useSuppliers(search);
  const { data: companies = [] } = useCompanies();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const validateForm = (form: SupplierFormState) => {
    if (!form.supplierName.trim()) {
      toast.error('Supplier name is required');
      return false;
    }
    if (!form.contactPerson.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Contact person, email, and phone are required');
      return false;
    }
    return true;
  };

  const onCreate = async () => {
    if (!validateForm(createForm)) return;
    try {
      await createSupplier.mutateAsync(formToPayload(createForm));
      setCreateForm(emptyForm());
      setSearch('');
      toast.success('Supplier created successfully');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to create supplier';
      toast.error(msg);
    }
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditForm(formFromSupplier(supplier));
    setEditSheetOpen(true);
  };

  const onUpdate = async () => {
    if (!editingSupplier) return;
    if (!validateForm(editForm)) return;
    try {
      await updateSupplier.mutateAsync({
        id: editingSupplier.id,
        ...formToPayload(editForm),
      });
      setEditSheetOpen(false);
      setEditingSupplier(null);
      toast.success('Supplier updated successfully');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to update supplier';
      toast.error(msg);
    }
  };

  return (
    <AppLayout active="Suppliers">
      <div className="space-y-6">
        <PageHeader title="Suppliers" description="Supplier company/contact and payment details.">
          <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Create Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SupplierFormFields
              form={createForm}
              setForm={setCreateForm}
              companies={companies}
              codeHint="Leave blank to auto-generate (e.g. SUP-0001)"
            />
            <Button onClick={onCreate} disabled={createSupplier.isPending}>
              {createSupplier.isPending ? 'Saving...' : 'Create Supplier'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading...</TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No suppliers found.</TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.supplierCode || '—'}</TableCell>
                      <TableCell>{s.supplierName}</TableCell>
                      <TableCell>{s.contactPerson || '—'}</TableCell>
                      <TableCell>{s.email || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.isActive ? 'Active' : 'Inactive'} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit supplier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit Supplier</SheetTitle>
            <SheetDescription>
              {editingSupplier ? `Update ${editingSupplier.supplierName}` : 'Update supplier details'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <SupplierFormFields form={editForm} setForm={setEditForm} companies={companies} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditSheetOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={onUpdate} disabled={updateSupplier.isPending}>
                {updateSupplier.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

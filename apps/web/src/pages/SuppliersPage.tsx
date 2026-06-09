import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader, SearchInput, ConfirmDialog, CreatePageLayout, LoadingSkeleton, EmptyState } from '@/components/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSuccessPulse } from '@/hooks/use-success-pulse';
import { showActionSuccess } from '@/lib/action-feedback';
import { cn } from '@/lib/cn';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useRequestSupplierDeletion,
  useSupplierDeletionImpact,
  type Supplier,
  type CreateSupplierPayload,
} from '@/hooks/use-suppliers';
import {
  normalizePostalCodeInput,
  usePostalCodeLookup,
  type PostalCodeLookup,
} from '@/hooks/use-postal-code-lookup';
import { useCompanies } from '@/hooks/use-companies';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';
import { cn } from '@/lib/cn';

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

type StatusFilter = 'all' | 'active' | 'inactive';

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
    taxId: form.taxId ? form.taxId.toUpperCase() : undefined,
    vatNumber: form.vatNumber ? form.vatNumber.toUpperCase() : undefined,
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

function supplierInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function StarRating({ value }: { value: number }) {
  const rounded = Math.min(5, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
          )}
        />
      ))}
    </div>
  );
}

function mergeSupplierPostalLookup(
  form: SupplierFormState,
  lookup: PostalCodeLookup,
): SupplierFormState {
  const postalCode = normalizePostalCodeInput(form.postalCode);
  if (postalCode !== lookup.postalCode) return form;

  const nextCountry =
    !form.country.trim() || form.country.trim().toLowerCase() === 'india'
      ? lookup.country
      : form.country;

  if (
    form.postalCode === lookup.postalCode &&
    form.city === lookup.city &&
    form.state === lookup.state &&
    form.country === nextCountry
  ) {
    return form;
  }

  return {
    ...form,
    postalCode: lookup.postalCode,
    city: lookup.city,
    state: lookup.state,
    country: nextCountry,
  };
}

function KpiCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
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
  const postalLookup = usePostalCodeLookup(form.postalCode);

  useEffect(() => {
    if (!postalLookup.data) return;
    setForm((prev) => mergeSupplierPostalLookup(prev, postalLookup.data));
  }, [postalLookup.data, setForm]);

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Company information</h3>
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
            <Label>Supplier name *</Label>
            <Input
              value={form.supplierName}
              onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Supplier code</Label>
            <Input
              value={form.supplierCode}
              onChange={(e) => setForm((p) => ({ ...p, supplierCode: e.target.value }))}
              placeholder={codeHint ?? 'Auto-generated if empty'}
            />
          </div>
          <div className="space-y-2">
            <Label>Rating</Label>
            <Select
              value={String(form.rating)}
              onValueChange={(v) => setForm((p) => ({ ...p, rating: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>GSTIN</Label>
            <Input value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>PAN</Label>
            <Input
              value={form.vatNumber}
              onChange={(e) => setForm((p) => ({ ...p, vatNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Supply categories (comma separated)</Label>
            <Input
              value={form.categories}
              onChange={(e) => setForm((p) => ({ ...p, categories: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Contact details</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Contact person *</Label>
            <Input
              value={form.contactPerson}
              onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
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
            <Label>Street address</Label>
            <Input value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>State / province</Label>
            <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>ZIP / postal code</Label>
            <Input
              value={form.postalCode}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) =>
                setForm((p) => ({ ...p, postalCode: normalizePostalCodeInput(e.target.value) }))
              }
            />
            <p className="text-xs text-slate-500">
              {postalLookup.isFetching
                ? 'Fetching city from postal code...'
                : postalLookup.data
                  ? `Auto-filled ${postalLookup.data.city}, ${postalLookup.data.state}.`
                  : postalLookup.errorMessage
                    ? postalLookup.errorMessage
                    : 'Enter a 6-digit postal code to auto-fill city and state.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Payment & banking</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Payment terms</Label>
            <Input
              value={form.paymentTerms}
              onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Bank name</Label>
            <Input value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Account number</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Routing / SWIFT</Label>
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

const csvColumns: CsvColumn<Supplier>[] = [
  { header: 'Supplier Name', value: (s) => s.supplierName },
  { header: 'Code', value: (s) => s.supplierCode },
  { header: 'Contact', value: (s) => s.contactPerson },
  { header: 'Email', value: (s) => s.email },
  { header: 'Phone', value: (s) => s.phone },
  { header: 'GSTIN', value: (s) => s.taxId },
  { header: 'PAN', value: (s) => s.vatNumber },
  { header: 'Rating', value: (s) => s.rating },
  { header: 'Status', value: (s) => (s.isActive ? 'Active' : 'Inactive') },
];

function SuppliersCreateView() {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const createSupplier = useCreateSupplier();
  const { pulseClass, triggerPulse } = useSuccessPulse();
  const [createForm, setCreateForm] = useState(emptyForm);

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
      triggerPulse();
      showActionSuccess({ message: 'Supplier created successfully' });
      navigate('/suppliers');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to create supplier';
      toast.error(msg);
    }
  };

  return (
    <CreatePageLayout
      title="Add Supplier"
      description="Register a new supplier with contact and payment details"
      backTo="/suppliers"
    >
      <Card className={cn(pulseClass)}>
        <CardHeader>
          <CardTitle>Supplier details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SupplierFormFields
            form={createForm}
            setForm={setCreateForm}
            companies={companies}
            codeHint="Leave blank to auto-generate (e.g. SUP-0001)"
          />
          <Button
            onClick={onCreate}
            loading={createSupplier.isPending}
            loadingLabel="Creating…"
          >
            Create Supplier
          </Button>
        </CardContent>
      </Card>
    </CreatePageLayout>
  );
}

function SuppliersListView() {
  const navigate = useNavigate();
  const { data: allSuppliers = [], isLoading } = useSuppliers();
  const { data: companies = [] } = useCompanies();
  const updateSupplier = useUpdateSupplier();
  const requestDeletion = useRequestSupplierDeletion();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const deletionImpact = useSupplierDeletionImpact(deleteTarget?.id ?? null);

  const stats = useMemo(() => {
    const active = allSuppliers.filter((s) => s.isActive).length;
    return {
      total: allSuppliers.length,
      active,
      inactive: allSuppliers.length - active,
    };
  }, [allSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return allSuppliers.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (!term) return true;
      const hay = [
        s.supplierName,
        s.supplierCode,
        s.contactPerson,
        s.email,
        s.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [allSuppliers, debouncedSearch, statusFilter]);

  const isSearchPending = search !== debouncedSearch;

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

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditForm(formFromSupplier(supplier));
    setEditSheetOpen(true);
  };

  const openView = (supplier: Supplier) => {
    setViewSupplier(supplier);
    setViewSheetOpen(true);
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
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to update supplier';
      toast.error(msg);
    }
  };

  const onRequestDeletion = async () => {
    if (!deleteTarget) return;
    try {
      const result = await requestDeletion.mutateAsync(deleteTarget.id);
      toast.success(result.message);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to request supplier deletion';
      toast.error(msg);
    }
  };

  const exportCsv = () => {
    downloadCsv('suppliers.csv', toCsv(filteredSuppliers, csvColumns));
    toast.success('CSV exported');
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Suppliers"
          description={`${stats.total} registered supplier${stats.total === 1 ? '' : 's'}`}
        >
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            className="shadow-md"
            onClick={() => navigate('/suppliers/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Total suppliers"
            value={stats.total}
            accent="bg-primary"
            icon={<Building2 className="h-5 w-5 text-primary" />}
          />
          <KpiCard
            label="Active"
            value={stats.active}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
          <KpiCard
            label="Inactive"
            value={stats.inactive}
            accent="bg-amber-500"
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          />
        </div>

        <Card className="border-slate-200/90 shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                placeholder="Search by name, code or contact…"
                value={search}
                onChange={setSearch}
                isSearching={isSearchPending || isLoading}
                showNoResults={
                  !isLoading &&
                  !isSearchPending &&
                  search.trim().length > 0 &&
                  filteredSuppliers.length === 0
                }
                noResultsMessage="No suppliers match your search."
                className="max-w-md flex-1"
              />
              <div className="flex items-center gap-2 sm:w-44">
                <Label className="shrink-0 text-xs text-slate-500">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              {isLoading ? (
                <div className="p-4">
                  <LoadingSkeleton rows={8} cols={10} />
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <EmptyState
                  icon={Truck}
                  title={search.trim() || statusFilter !== 'all' ? 'No suppliers match your filters' : 'No suppliers yet'}
                  description={
                    search.trim() || statusFilter !== 'all'
                      ? 'Try a different search term or status filter.'
                      : 'Onboard your first vendor to start procurement.'
                  }
                  action={
                    !search.trim() && statusFilter === 'all' ? (
                      <Button onClick={() => navigate('/suppliers/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Supplier
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Supplier
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Code
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Contact
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Email
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Phone
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      GSTIN
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      PAN
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Rating
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary"
                              aria-hidden
                            >
                              {supplierInitials(s.supplierName)}
                            </div>
                            <span className="font-semibold text-slate-900">{s.supplierName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                            {s.supplierCode || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-700">{s.contactPerson || '—'}</TableCell>
                        <TableCell>
                          {s.email ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="max-w-[180px] truncate">{s.email}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {s.phone ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {s.phone}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-700">
                          {s.taxId || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-700">
                          {s.vatNumber || '—'}
                        </TableCell>
                        <TableCell>
                          <StarRating value={s.rating} />
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                              s.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View"
                              onClick={() => openView(s)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit"
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              title="Deactivate"
                              onClick={() => setDeleteTarget(s)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit supplier</SheetTitle>
            <SheetDescription>
              {editingSupplier ? `Update ${editingSupplier.supplierName}` : 'Update supplier details'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <SupplierFormFields form={editForm} setForm={setEditForm} companies={companies} />
            <div className="flex gap-3 border-t pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={onUpdate}
                disabled={updateSupplier.isPending}
              >
                {updateSupplier.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{viewSupplier?.supplierName}</SheetTitle>
            <SheetDescription>{viewSupplier?.supplierCode}</SheetDescription>
          </SheetHeader>
          {viewSupplier && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-bold text-primary">
                  {supplierInitials(viewSupplier.supplierName)}
                </div>
                <div>
                  <StarRating value={viewSupplier.rating} />
                  <span
                    className={cn(
                      'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      viewSupplier.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {viewSupplier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <dl className="grid gap-3">
                {[
                  ['Contact', viewSupplier.contactPerson],
                  ['Email', viewSupplier.email],
                  ['Phone', viewSupplier.phone],
                  ['GSTIN', viewSupplier.taxId],
                  ['PAN', viewSupplier.vatNumber],
                  ['Payment terms', viewSupplier.paymentTerms],
                  ['Address', [viewSupplier.street, viewSupplier.city, viewSupplier.country].filter(Boolean).join(', ')],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-slate-900">{val || '—'}</dd>
                  </div>
                ))}
              </dl>
              <Button variant="outline" className="w-full" onClick={() => {
                setViewSheetOpen(false);
                openEdit(viewSupplier);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit supplier
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete supplier?"
        description={
          deleteTarget ? (
            <span className="block space-y-3 text-left text-sm">
              <span className="block text-slate-600">
                An email will be sent to the admin to confirm deletion of{' '}
                <strong>{deleteTarget.supplierName}</strong>. The supplier is not removed until the
                link in that email is opened.
              </span>
              {deletionImpact.isLoading ? (
                <span className="block text-slate-500">Loading linked records…</span>
              ) : deletionImpact.data ? (
                <span className="block rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
                  <span className="font-medium">Linked records (kept in history):</span>
                  <ul className="mt-2 list-inside list-disc space-y-0.5">
                    <li>{deletionImpact.data.counts.rfqInvitations} RFQ invitation(s)</li>
                    <li>{deletionImpact.data.counts.quotations} quotation(s)</li>
                    <li>{deletionImpact.data.counts.contracts} contract(s)</li>
                    <li>{deletionImpact.data.counts.purchaseOrders} purchase order(s)</li>
                  </ul>
                </span>
              ) : null}
            </span>
          ) : (
            ''
          )
        }
        confirmLabel="Send confirmation email"
        variant="destructive"
        onConfirm={onRequestDeletion}
        loading={requestDeletion.isPending}
      />
    </>
  );
}

export function SuppliersPage({ createOnly = false }: { createOnly?: boolean }) {
  return (
    <AppLayout active="Suppliers">
      {createOnly ? <SuppliersCreateView /> : <SuppliersListView />}
    </AppLayout>
  );
}

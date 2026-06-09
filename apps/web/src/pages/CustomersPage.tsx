import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader, SearchInput, ConfirmDialog, CreatePageLayout, LoadingSkeleton, FormErrorBanner, EmptyState } from '@/components/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSuccessPulse } from '@/hooks/use-success-pulse';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  type Customer,
} from '@/hooks/use-customers';
import { normalizePostalCodeInput, usePostalCodeLookup } from '@/hooks/use-postal-code-lookup';
import { useShops } from '@/hooks/use-shops';
import { useAuthStore } from '@/store/authStore';
import { useCookieConsentStore } from '@/store/cookieConsentStore';
import { isShopOnlyUser } from '@/lib/shop-scope';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';
import { getApiErrorMessage } from '@/lib/api-error';
import { getDuplicateRecordDetails, toastDuplicateRecordError } from '@/lib/duplicate-error';
import { showActionError, showActionSuccess } from '@/lib/action-feedback';
import { formErrorMessage, parseApiFieldErrors } from '@/lib/field-errors';
import { resolvePreferredOrgId, syncPreferredOrgId } from '@/lib/cookie-consent';

type StatusFilter = 'all' | 'active' | 'inactive';

type CustomerForm = {
  shopId: string;
  customerName: string;
  email: string;
  phone: string;
  taxId: string;
  pan: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

const emptyForm = (): CustomerForm => ({
  shopId: '',
  customerName: '',
  email: '',
  phone: '',
  taxId: '',
  pan: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
});

function stripOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '??';
}

function avatarColor(name: string): string {
  const hues = [
    'bg-muted text-primary',
    'bg-sky-100 text-sky-800',
    'bg-violet-100 text-violet-800',
    'bg-emerald-100 text-emerald-800',
    'bg-amber-100 text-amber-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + hash * 31;
  return hues[Math.abs(hash) % hues.length];
}

function mergeCustomerPostalLookup(form: CustomerForm, lookup: { postalCode: string; city: string; state: string }) {
  const postalCode = normalizePostalCodeInput(form.postalCode);
  if (postalCode !== lookup.postalCode) return form;
  if (
    form.postalCode === lookup.postalCode &&
    form.city === lookup.city &&
    form.state === lookup.state
  ) {
    return form;
  }
  return {
    ...form,
    postalCode: lookup.postalCode,
    city: lookup.city,
    state: lookup.state,
  };
}

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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
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

type CustomerFormFieldsProps = {
  form: CustomerForm;
  setForm: React.Dispatch<React.SetStateAction<CustomerForm>>;
  showPlantSelect: boolean;
  shopLocked: boolean;
  shops: Array<{ id: string; shopName: string }>;
  resolvedShopId: string;
  functionalCookiesEnabled: boolean;
  fieldErrors?: Record<string, string>;
};

function CustomerFormFields({
  form,
  setForm,
  showPlantSelect,
  shopLocked,
  shops,
  resolvedShopId,
  functionalCookiesEnabled,
  fieldErrors = {},
}: CustomerFormFieldsProps) {
  const postalLookup = usePostalCodeLookup(form.postalCode);

  useEffect(() => {
    if (!postalLookup.data) return;
    setForm((prev) => mergeCustomerPostalLookup(prev, postalLookup.data));
  }, [postalLookup.data, setForm]);

  return (
    <div className="space-y-4">
      {showPlantSelect && !shopLocked && shops.length > 0 ? (
        <div className="space-y-2">
          <Label>Plant *</Label>
          <Select
            value={form.shopId || resolvedShopId}
            onValueChange={(v) => {
              setForm((p) => ({ ...p, shopId: v }));
              syncPreferredOrgId(v, functionalCookiesEnabled);
            }}
          >
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
      ) : null}
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          value={form.customerName}
          onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
          aria-invalid={Boolean(fieldErrors.customerName)}
          className={cn(fieldErrors.customerName && 'motion-field-error')}
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          aria-invalid={Boolean(fieldErrors.email)}
          className={cn(fieldErrors.email && 'motion-field-error')}
        />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>GSTIN</Label>
          <Input
            value={form.taxId}
            onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
            placeholder="15-character GSTIN"
          />
        </div>
        <div className="space-y-2">
          <Label>PAN</Label>
          <Input
            value={form.pan}
            onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value }))}
            placeholder="10-character PAN"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Street / address line</Label>
        <Input
          value={form.street}
          onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
          placeholder="Building, street, locality"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
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
          <Label>City</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input
            value={form.state}
            onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

function buildCustomerPayload(form: CustomerForm, resolvedShopId: string) {
  return {
    shopId: resolvedShopId || undefined,
    customerName: form.customerName.trim(),
    email: stripOptional(form.email),
    phone: stripOptional(form.phone),
    taxId: stripOptional(form.taxId)?.toUpperCase?.(),
    pan: stripOptional(form.pan)?.toUpperCase?.(),
    street: stripOptional(form.street),
    city: stripOptional(form.city),
    state: stripOptional(form.state),
    postalCode: stripOptional(form.postalCode),
    isActive: true,
  };
}

function CustomersCreateView() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const shopLocked = isShopOnlyUser(user);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const { data: shops = [] } = useShops();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { pulseClass, triggerPulse } = useSuccessPulse();

  const resolvedShopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    form.shopId,
  );

  useEffect(() => {
    syncPreferredOrgId(user?.shopId ? null : resolvedShopId, functionalCookiesEnabled);
  }, [functionalCookiesEnabled, resolvedShopId, user?.shopId]);

  const submitCreate = async () => {
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!resolvedShopId) {
      toast.error('Please select a plant');
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      await createCustomer.mutateAsync(buildCustomerPayload(form, resolvedShopId));
      triggerPulse();
      showActionSuccess({ message: 'Customer created' });
      navigate('/customers');
    } catch (err: unknown) {
      const duplicate = getDuplicateRecordDetails(err);
      if (duplicate) {
        toastDuplicateRecordError(err, {
          navigate: (path, state) => navigate(path, { state }),
          onRestore: async (details) => {
            await updateCustomer.mutateAsync({
              id: details.recordId,
              payload: { isActive: true },
            });
            toast.success('Customer restored');
            navigate('/customers', { state: { duplicateRecordId: details.recordId } });
          },
          fallback: 'Failed to create customer',
        });
        setFormError(getApiErrorMessage(err, 'Customer already exists'));
        return;
      }
      const errors = parseApiFieldErrors(err);
      setFieldErrors(errors);
      const message = formErrorMessage(errors) || getApiErrorMessage(err, 'Failed to create customer');
      setFormError(message);
      showActionError({ message, retry: () => void submitCreate() });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreate = () => void submitCreate();

  return (
    <CreatePageLayout
      title="Add Customer"
      description="Register a new sales customer"
      backTo="/customers"
    >
      <Card className={cn(pulseClass)}>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-5', isSubmitting && 'opacity-90')}>
          <FormErrorBanner message={formError} onRetry={() => void submitCreate()} />
          <CustomerFormFields
            form={form}
            setForm={setForm}
            showPlantSelect
            shopLocked={shopLocked}
            shops={shops}
            resolvedShopId={resolvedShopId}
            functionalCookiesEnabled={functionalCookiesEnabled}
            fieldErrors={fieldErrors}
          />
          <Button
            onClick={onCreate}
            loading={isSubmitting}
            loadingLabel="Creating…"
          >
            Add Customer
          </Button>
        </CardContent>
      </Card>
    </CreatePageLayout>
  );
}

function CustomersListView() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const shopLocked = isShopOnlyUser(user);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: customers = [], isLoading } = useCustomers(debouncedSearch, {
    fetchAll: !debouncedSearch.trim(),
  });
  const isSearchPending = search !== debouncedSearch || (isLoading && search.trim().length > 0);
  const { data: shops = [] } = useShops();
  const updateCustomer = useUpdateCustomer();

  const resolvedShopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    form.shopId,
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;
      return true;
    });
  }, [customers, statusFilter]);

  const stats = useMemo(() => {
    const active = customers.filter((c) => c.isActive).length;
    return { total: customers.length, active };
  }, [customers]);

  useEffect(() => {
    syncPreferredOrgId(user?.shopId ? null : resolvedShopId, functionalCookiesEnabled);
  }, [functionalCookiesEnabled, resolvedShopId, user?.shopId]);

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      shopId: '',
      customerName: c.customerName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      taxId: c.taxId ?? '',
      pan: c.pan ?? '',
      street: c.street ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      postalCode: c.postalCode ?? '',
    });
    setSheetOpen(true);
  }

  async function onSaveEdit() {
    if (!editing) return;
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const payload = {
      customerName: form.customerName.trim(),
      email: stripOptional(form.email),
      phone: stripOptional(form.phone),
      taxId: stripOptional(form.taxId)?.toUpperCase?.(),
      pan: stripOptional(form.pan)?.toUpperCase?.(),
      street: stripOptional(form.street),
      city: stripOptional(form.city),
      state: stripOptional(form.state),
      postalCode: stripOptional(form.postalCode),
    };

    try {
      await updateCustomer.mutateAsync({ id: editing.id, payload });
      toast.success('Customer updated');
      setSheetOpen(false);
      setEditing(null);
      setForm(emptyForm());
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save customer'));
    }
  }

  async function onDeactivate() {
    if (!deactivateTarget) return;
    try {
      await updateCustomer.mutateAsync({
        id: deactivateTarget.id,
        payload: { isActive: false },
      });
      toast.success(`${deactivateTarget.customerName} deactivated`);
      setDeactivateTarget(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to deactivate customer'));
    }
  }

  function onExportCsv() {
    const columns: CsvColumn<Customer>[] = [
      { header: 'Code', value: (r) => r.customerCode },
      { header: 'Name', value: (r) => r.customerName },
      { header: 'Email', value: (r) => r.email ?? '' },
      { header: 'Phone', value: (r) => r.phone ?? '' },
      { header: 'GSTIN', value: (r) => r.taxId ?? '' },
      { header: 'PAN', value: (r) => r.pan ?? '' },
      { header: 'City', value: (r) => r.city ?? '' },
      { header: 'Status', value: (r) => (r.isActive ? 'Active' : 'Inactive') },
    ];
    downloadCsv('customers.csv', toCsv(filtered, columns));
    toast.success('CSV exported');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${stats.total} registered customer${stats.total === 1 ? '' : 's'}`}
      >
        <Button variant="outline" onClick={onExportCsv} disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button onClick={() => navigate('/customers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard
          label="Total Customers"
          value={stats.total}
          accent="bg-primary"
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <KpiCard
          label="Active"
          value={stats.active}
          accent="bg-emerald-500"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card className="border-slate-200/90 shadow-sm">
        <CardContent className="space-y-4 p-4 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              placeholder="Search by name, code or email…"
              value={search}
              onChange={setSearch}
              isSearching={isSearchPending}
              showNoResults={!isLoading && !isSearchPending && search.trim().length > 0 && filtered.length === 0}
              noResultsMessage="No customers match your search."
              className="max-w-md"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            {isLoading ? (
              <div className="p-4">
                <LoadingSkeleton rows={8} cols={9} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title={search.trim() || statusFilter !== 'all' ? 'No customers match your filters' : 'No customers yet'}
                description={
                  search.trim() || statusFilter !== 'all'
                    ? 'Try a different search term or status filter.'
                    : 'Add your first customer to start recording sales and quotations.'
                }
                action={
                  !search.trim() && statusFilter === 'all' ? (
                    <Button onClick={() => navigate('/customers/new')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Customer
                    </Button>
                  ) : undefined
                }
              />
            ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Customer
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
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              avatarColor(c.customerName),
                            )}
                          >
                            {customerInitials(c.customerName)}
                          </span>
                          <span className="font-medium text-slate-900">{c.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{c.customerCode}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {c.city || c.state || '—'}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-slate-600">
                        {c.email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{c.phone || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{c.taxId || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{c.pan || '—'}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                            c.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View"
                            onClick={() => setViewing(c)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {c.isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              title="Deactivate"
                              onClick={() => setDeactivateTarget(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditing(null);
            setForm(emptyForm());
          }
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Customer</SheetTitle>
            <SheetDescription>Update customer details.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <CustomerFormFields
              form={form}
              setForm={setForm}
              showPlantSelect={false}
              shopLocked={shopLocked}
              shops={shops}
              resolvedShopId={resolvedShopId}
              functionalCookiesEnabled={functionalCookiesEnabled}
            />
            <Button
              className="w-full"
              disabled={updateCustomer.isPending}
              onClick={onSaveEdit}
            >
              {updateCustomer.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{viewing?.customerName}</SheetTitle>
            <SheetDescription>{viewing?.customerCode}</SheetDescription>
          </SheetHeader>
          {viewing && (
            <dl className="mt-6 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd>{viewing.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd>{viewing.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">GSTIN</dt>
                <dd>{viewing.taxId || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">PAN</dt>
                <dd>{viewing.pan || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd>
                  {[viewing.city, viewing.state].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Postal code</dt>
                <dd>{viewing.postalCode || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>{viewing.isActive ? 'Active' : 'Inactive'}</dd>
              </div>
            </dl>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate customer?"
        description={
          deactivateTarget
            ? `Deactivate ${deactivateTarget.customerName}? They will no longer appear in active lists.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="destructive"
        loading={updateCustomer.isPending}
        onConfirm={onDeactivate}
      />
    </div>
  );
}

export function CustomersPage({ createOnly = false }: { createOnly?: boolean }) {
  return (
    <AppLayout active="Customers">
      {createOnly ? <CustomersCreateView /> : <CustomersListView />}
    </AppLayout>
  );
}

import { useMemo, useState } from 'react';
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
import { PageHeader, SearchInput, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useShops } from '@/hooks/use-shops';
import { useAuthStore } from '@/store/authStore';
import { isShopOnlyUser } from '@/lib/shop-scope';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';

type StatusFilter = 'all' | 'active' | 'inactive';

type CustomerForm = {
  shopId: string;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
};

const emptyForm = (): CustomerForm => ({
  shopId: '',
  customerName: '',
  email: '',
  phone: '',
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
    'bg-indigo-100 text-indigo-800',
    'bg-sky-100 text-sky-800',
    'bg-violet-100 text-violet-800',
    'bg-emerald-100 text-emerald-800',
    'bg-amber-100 text-amber-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + hash * 31;
  return hues[Math.abs(hash) % hues.length];
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

export function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const shopLocked = isShopOnlyUser(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: customers = [], isLoading } = useCustomers(search);
  const { data: shops = [] } = useShops();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const resolvedShopId = user?.shopId ?? form.shopId ?? shops[0]?.id ?? '';

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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      shopId: '',
      customerName: c.customerName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      postalCode: '',
    });
    setSheetOpen(true);
  }

  async function onSave() {
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!resolvedShopId && !editing) {
      toast.error('Please select a plant');
      return;
    }

    const payload = {
      shopId: resolvedShopId || undefined,
      customerName: form.customerName.trim(),
      email: stripOptional(form.email),
      phone: stripOptional(form.phone),
      city: stripOptional(form.city),
      state: stripOptional(form.state),
      postalCode: stripOptional(form.postalCode),
      isActive: true,
    };

    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, payload });
        toast.success('Customer updated');
      } else {
        await createCustomer.mutateAsync(payload);
        toast.success('Customer created');
      }
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
      { header: 'City', value: (r) => r.city ?? '' },
      { header: 'Status', value: (r) => (r.isActive ? 'Active' : 'Inactive') },
    ];
    downloadCsv('customers.csv', toCsv(filtered, columns));
    toast.success('CSV exported');
  }

  return (
    <AppLayout active="Customers">
      <div className="space-y-6">
        <PageHeader
          title="Customers"
          description={`${stats.total} registered customer${stats.total === 1 ? '' : 's'}`}
        >
          <Button variant="outline" onClick={onExportCsv} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard
            label="Total Customers"
            value={stats.total}
            accent="bg-indigo-500"
            icon={<Users className="h-5 w-5 text-indigo-600" />}
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
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        Loading customers…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        No customers in this view.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Customer' : 'Add Customer'}</SheetTitle>
            <SheetDescription>
              {editing ? 'Update customer details.' : 'Register a new sales customer.'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!shopLocked && !editing && shops.length > 0 ? (
              <div className="space-y-2">
                <Label>Plant *</Label>
                <Select
                  value={form.shopId || resolvedShopId}
                  onValueChange={(v) => setForm((p) => ({ ...p, shopId: v }))}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={createCustomer.isPending || updateCustomer.isPending}
              onClick={onSave}
            >
              {createCustomer.isPending || updateCustomer.isPending
                ? 'Saving…'
                : editing
                  ? 'Save Changes'
                  : 'Add Customer'}
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
                <dt className="text-slate-500">Location</dt>
                <dd>
                  {[viewing.city, viewing.state].filter(Boolean).join(', ') || '—'}
                </dd>
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
    </AppLayout>
  );
}

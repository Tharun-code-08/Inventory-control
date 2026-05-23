import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Factory,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
  type Company,
} from '@/hooks/use-companies';
import { useShops, type Shop } from '@/hooks/use-shops';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/store/authStore';

type CompanyFormState = {
  companyCode: string;
  companyName: string;
  address: string;
  isActive: boolean;
};

const emptyForm = (): CompanyFormState => ({
  companyCode: '',
  companyName: '',
  address: '',
  isActive: true,
});

function formFromCompany(c: Company): CompanyFormState {
  return {
    companyCode: c.companyCode ?? '',
    companyName: c.companyName ?? '',
    address: c.address ?? '',
    isActive: c.isActive,
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

function CompanyStatusBadge({ active }: { active: boolean }) {
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

type CompanyFormFieldsProps = {
  form: CompanyFormState;
  setForm: React.Dispatch<React.SetStateAction<CompanyFormState>>;
  codeDisabled?: boolean;
  firstFieldRef?: React.RefObject<HTMLInputElement | null>;
};

function CompanyFormFields({ form, setForm, codeDisabled, firstFieldRef }: CompanyFormFieldsProps) {
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label>Company Code</Label>
        <Input
          ref={firstFieldRef}
          value={form.companyCode}
          disabled={codeDisabled}
          placeholder="Auto-generated if empty"
          onChange={(e) => setForm((p) => ({ ...p, companyCode: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Company Name *</Label>
        <Input
          value={form.companyName}
          onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
        />
        <div>
          <Label className="cursor-pointer">Active</Label>
          <p className="text-xs text-slate-500">Inactive companies are hidden from new assignments</p>
        </div>
      </div>
    </div>
  );
}

type CompanyCardProps = {
  company: Company;
  plants: Shop[];
  onEdit: () => void;
  onDeactivate: () => void;
};

function CompanyCard({ company, plants, onEdit, onDeactivate }: CompanyCardProps) {
  const activePlants = plants.filter((p) => p.isActive);

  return (
    <Card className="flex flex-col border-slate-200/90 shadow-sm">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{company.companyName}</p>
              <span className="mt-1 inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                {company.companyCode}
              </span>
            </div>
          </div>
          <CompanyStatusBadge active={company.isActive} />
        </div>

        <div className="mt-4 text-sm text-slate-600">
          {company.address ? (
            <p className="leading-relaxed">{company.address}</p>
          ) : (
            <p className="text-slate-400">No address on file</p>
          )}
        </div>

        <div className="mt-4 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plants ({activePlants.length})
          </p>
          {activePlants.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No plants linked to this company</p>
          ) : (
            <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto">
              {activePlants.map((plant) => (
                <li key={plant.id} className="flex gap-2 text-sm">
                  <Factory className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{plant.shopName}</p>
                    <p className="text-xs text-slate-500">{plant.shopNumber}</p>
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
            aria-label="Edit company"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {company.isActive && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
              aria-label="Deactivate company"
              onClick={onDeactivate}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CompaniesListView() {
  const navigate = useNavigate();
  const companyId = useAuthStore((s) => s.user?.companyId);
  const canCreateCompany = !companyId;
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: shops = [], isLoading: shopsLoading } = useShops();
  const updateCompany = useUpdateCompany();
  const deactivateCompany = useDeleteCompany();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const plantsByCompany = useMemo(() => {
    const map = new Map<string, Shop[]>();
    for (const shop of shops) {
      if (!shop.companyId) continue;
      const list = map.get(shop.companyId) ?? [];
      list.push(shop);
      map.set(shop.companyId, list);
    }
    return map;
  }, [shops]);

  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.isActive).length;
    const plants = shops.filter((s) => s.isActive && s.companyId).length;
    return { total, active, plants };
  }, [companies, shops]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm(formFromCompany(company));
    setSheetOpen(true);
  };

  const onActivate = async (company: Company) => {
    try {
      await updateCompany.mutateAsync({ id: company.id, isActive: true });
      toast.success(`${company.companyName} activated`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to activate company'));
    }
  };

  const onDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateCompany.mutateAsync(deactivateTarget.id);
      toast.success(`${deactivateTarget.companyName} deactivated`);
      setDeactivateTarget(null);
      if (editing?.id === deactivateTarget.id) {
        setSheetOpen(false);
        resetForm();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to deactivate company'));
    }
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateCompany.mutateAsync({
        id: editing.id,
        companyCode: form.companyCode.trim() || undefined,
        companyName: form.companyName.trim(),
        address: form.address.trim() || undefined,
        isActive: form.isActive,
      });
      toast.success('Company updated');
      setSheetOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update company'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = companiesLoading || shopsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={
          canCreateCompany
            ? 'Legal entities and company master for plants and suppliers'
            : 'Your organisation profile (created when you signed up)'
        }
      >
        {canCreateCompany ? (
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate('/companies/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        ) : null}
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Total Companies"
          value={stats.total}
          accent="bg-indigo-500"
          icon={<Building2 className="h-5 w-5 text-indigo-600" />}
        />
        <KpiCard
          label="Active"
          value={stats.active}
          accent="bg-emerald-500"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <KpiCard
          label="Linked Plants"
          value={stats.plants}
          accent="bg-sky-500"
          icon={<Factory className="h-5 w-5 text-sky-600" />}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="mb-3 h-12 w-12 text-slate-300" />
            <p className="font-medium text-slate-700">No organisation found</p>
            <p className="mt-1 text-sm text-slate-500">
              {canCreateCompany
                ? 'Add a company to group plants and suppliers under one legal entity.'
                : 'Your workspace company could not be loaded. Sign out and sign in again, or contact support.'}
            </p>
            {canCreateCompany ? (
              <Button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate('/companies/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              plants={plantsByCompany.get(company.id) ?? []}
              onEdit={() => openEdit(company)}
              onDeactivate={() => setDeactivateTarget(company)}
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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Company</SheetTitle>
            <SheetDescription>
              Update details for {editing?.companyName ?? 'this company'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <CompanyFormFields form={form} setForm={setForm} firstFieldRef={firstFieldRef} />
            {editing && !editing.isActive && (
              <Button type="button" variant="outline" className="w-full" onClick={() => onActivate(editing)}>
                Activate company
              </Button>
            )}
            {editing?.isActive && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  setSheetOpen(false);
                  setDeactivateTarget(editing);
                }}
              >
                Deactivate company
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
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={onSaveEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate company</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate{' '}
              <span className="font-medium text-foreground">{deactivateTarget?.companyName}</span>?
              Linked plants and suppliers remain in the system but this company will not be available
              for new assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateCompany.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateCompany.isPending}
              onClick={onDeactivate}
            >
              {deactivateCompany.isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CompaniesCreateView() {
  const navigate = useNavigate();
  const createCompany = useCreateCompany();
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const onCreate = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await createCompany.mutateAsync({
        companyCode: form.companyCode.trim() || undefined,
        companyName: form.companyName.trim(),
        address: form.address.trim() || undefined,
        isActive: form.isActive,
      });
      toast.success('Company created');
      navigate('/companies');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create company'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-page-shell space-y-6 p-4 sm:p-6">
      <PageHeader title="Add Company" description="Create a legal entity for plants and suppliers">
        <Button variant="outline" onClick={() => navigate('/companies')}>
          Back
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <CompanyFormFields form={form} setForm={setForm} firstFieldRef={firstFieldRef} />
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={onCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Create Company'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function CompaniesPage({ createOnly = false }: { createOnly?: boolean }) {
  return (
    <AppLayout active="Companies">
      {createOnly ? <CompaniesCreateView /> : <CompaniesListView />}
    </AppLayout>
  );
}

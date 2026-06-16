import { useState } from 'react';
import { FileSpreadsheet, Plus, Send, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader, KpiCard, EmptyState, LoadingSkeleton } from '@/components/shared';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  useEwayBills,
  useEwayBillStats,
  useCreateEwayBill,
  useGenerateEwayBill,
  useCancelEwayBill,
  type EwayBill,
  type EwayBillStatus,
  type EwayTransportMode,
} from '@/hooks/use-eway-bills';

const TABS: { key: EwayBillStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'GENERATED', label: 'Generated' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const TRANSPORT_MODES: EwayTransportMode[] = ['ROAD', 'RAIL', 'AIR', 'SHIP'];

function inr(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
}

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyForm = () => ({
  documentNumber: '',
  documentDate: new Date().toISOString().slice(0, 10),
  fromName: '',
  toName: '',
  toGstin: '',
  toAddress: '',
  transportMode: 'ROAD' as EwayTransportMode,
  vehicleNumber: '',
  distanceKm: '',
  taxableValue: '',
  igstValue: '',
  totalValue: '',
  remarks: '',
});

export function EwayBillsPage({ createOnly = false }: { createOnly?: boolean }) {
  const [tab, setTab] = useState<EwayBillStatus | 'ALL'>('ALL');
  const { data: bills = [], isLoading } = useEwayBills(tab === 'ALL' ? undefined : tab);
  const { data: stats } = useEwayBillStats();
  const createBill = useCreateEwayBill();
  const generateBill = useGenerateEwayBill();
  const cancelBill = useCancelEwayBill();

  const [createOpen, setCreateOpen] = useState(createOnly);
  const [form, setForm] = useState(emptyForm);
  const [active, setActive] = useState<EwayBill | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!form.documentNumber.trim() || !form.fromName.trim() || !form.toName.trim()) {
      toast.error('Document number, consignor and consignee names are required.');
      return;
    }
    try {
      await createBill.mutateAsync({
        documentNumber: form.documentNumber.trim(),
        documentDate: form.documentDate,
        fromName: form.fromName.trim(),
        toName: form.toName.trim(),
        toGstin: form.toGstin.trim() || undefined,
        toAddress: form.toAddress.trim() || undefined,
        transportMode: form.transportMode,
        vehicleNumber: form.vehicleNumber.trim() || undefined,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        taxableValue: form.taxableValue ? Number(form.taxableValue) : undefined,
        igstValue: form.igstValue ? Number(form.igstValue) : undefined,
        totalValue: form.totalValue ? Number(form.totalValue) : undefined,
        remarks: form.remarks.trim() || undefined,
      });
      toast.success('Draft e-way bill created');
      setForm(emptyForm());
      setCreateOpen(false);
    } catch {
      toast.error('Could not create e-way bill.');
    }
  }

  async function handleGenerate(bill: EwayBill) {
    try {
      await generateBill.mutateAsync(bill.id);
      toast.success('E-way bill generated');
      setActive(null);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Could not generate e-way bill.';
      toast.error(msg);
    }
  }

  async function handleCancel() {
    if (!active) return;
    if (!cancelReason.trim()) {
      toast.error('A cancellation reason is required.');
      return;
    }
    try {
      await cancelBill.mutateAsync({ id: active.id, reason: cancelReason.trim() });
      toast.success('E-way bill cancelled');
      setActive(null);
      setCancelReason('');
    } catch {
      toast.error('Could not cancel e-way bill.');
    }
  }

  return (
    <AppLayout active="E-Way Bills">
      <PageHeader title="E-Way Bills" description="Generate and track GST e-way bills for goods movement.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New e-way bill
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Draft" value={stats?.draft ?? 0} accent="bg-slate-400" icon={<FileSpreadsheet className="h-5 w-5" />} />
        <KpiCard label="Generated" value={stats?.generated ?? 0} accent="bg-emerald-500" icon={<Send className="h-5 w-5" />} />
        <KpiCard label="Cancelled" value={stats?.cancelled ?? 0} accent="bg-red-500" icon={<XCircle className="h-5 w-5" />} />
        <KpiCard label="Expired" value={stats?.expired ?? 0} accent="bg-amber-500" icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="mb-3 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ' +
              (tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : bills.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No e-way bills"
              description="Create an e-way bill to document the transport of taxable goods."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EWB / Document</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid upto</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setActive(b)}>
                    <TableCell>
                      <div className="font-medium">{b.status === 'DRAFT' ? 'Draft' : b.ewayBillNumber}</div>
                      <div className="text-xs text-muted-foreground">{b.documentNumber}</div>
                    </TableCell>
                    <TableCell>{b.toName}</TableCell>
                    <TableCell className="text-right tabular-nums">{inr(b.totalValue)}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                    <TableCell>{fmtDate(b.validUpto)}</TableCell>
                    <TableCell className="text-right">
                      {b.status === 'DRAFT' ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleGenerate(b);
                          }}
                          disabled={generateBill.isPending}
                        >
                          Generate
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setActive(b); }}>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>New e-way bill</SheetTitle>
            <SheetDescription>Capture the consignment details, then generate the EWB number.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Document number</Label>
                <Input value={form.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} placeholder="INV-2026-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Document date</Label>
                <Input type="date" value={form.documentDate} onChange={(e) => set('documentDate', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Consignor (from)</Label>
              <Input value={form.fromName} onChange={(e) => set('fromName', e.target.value)} placeholder="Your business name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Consignee (to)</Label>
                <Input value={form.toName} onChange={(e) => set('toName', e.target.value)} placeholder="Customer name" />
              </div>
              <div className="space-y-1.5">
                <Label>Consignee GSTIN</Label>
                <Input value={form.toGstin} onChange={(e) => set('toGstin', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Consignee address</Label>
              <Input value={form.toAddress} onChange={(e) => set('toAddress', e.target.value)} placeholder="Delivery address" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Transport mode</Label>
                <Select value={form.transportMode} onValueChange={(v) => set('transportMode', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((m) => (
                      <SelectItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle no.</Label>
                <Input value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value)} placeholder="TN01AB1234" />
              </div>
              <div className="space-y-1.5">
                <Label>Distance (km)</Label>
                <Input type="number" value={form.distanceKm} onChange={(e) => set('distanceKm', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Taxable value</Label>
                <Input type="number" value={form.taxableValue} onChange={(e) => set('taxableValue', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>IGST</Label>
                <Input type="number" value={form.igstValue} onChange={(e) => set('igstValue', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Total value</Label>
                <Input type="number" value={form.totalValue} onChange={(e) => set('totalValue', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={createBill.isPending}>
              Create draft
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={Boolean(active)} onOpenChange={(open) => { if (!open) { setActive(null); setCancelReason(''); } }}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{active && active.status !== 'DRAFT' ? active.ewayBillNumber : 'Draft e-way bill'}</SheetTitle>
            <SheetDescription>{active?.documentNumber}</SheetDescription>
          </SheetHeader>
          {active && (
            <div className="flex flex-1 flex-col gap-4 py-4">
              <dl className="space-y-3 text-sm">
                <Row label="Status" value={<StatusBadge status={active.status} />} />
                <Row label="Consignor" value={active.fromName} />
                <Row label="Consignee" value={active.toName} />
                {active.toGstin && <Row label="Consignee GSTIN" value={active.toGstin} />}
                <Row label="Transport" value={`${active.transportMode}${active.vehicleNumber ? ` · ${active.vehicleNumber}` : ''}`} />
                {active.distanceKm != null && <Row label="Distance" value={`${active.distanceKm} km`} />}
                <Row label="Taxable value" value={inr(active.taxableValue)} />
                <Row label="IGST" value={inr(active.igstValue)} />
                <Row label="Total value" value={inr(active.totalValue)} />
                <Row label="Document date" value={fmtDate(active.documentDate)} />
                {active.validUpto && <Row label="Valid upto" value={fmtDate(active.validUpto)} />}
                {active.status === 'CANCELLED' && active.cancelReason && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Cancellation reason</dt>
                    <dd className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300">{active.cancelReason}</dd>
                  </div>
                )}
              </dl>

              {active.status === 'DRAFT' && (
                <Button className="w-full" onClick={() => void handleGenerate(active)} disabled={generateBill.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  Generate e-way bill
                </Button>
              )}

              {active.status === 'GENERATED' && (
                <div className="mt-auto space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Textarea
                    placeholder="Reason for cancellation…"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                  />
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                    onClick={handleCancel}
                    disabled={cancelBill.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel e-way bill
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
